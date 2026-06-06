import { useCallback } from 'react'
import {
  createFileSecret,
  defaultFileChunkSizeBytes,
  encodeFileAccessUrl,
  encodeTextAccessUrl,
  sealFileChunk,
  sealFileManifest,
  sealText,
} from 'secret-cipher'

import {
  completeFileSecret,
  createTextSecret,
  initFileSecret,
  uploadEncryptedFile,
} from '@/apis/secrets'
import { formatBytes, httpProgress, transferStatus } from '@/apis/progress'
import {
  analyticsErrorType,
  expirationBucket,
  sizeBucket,
  trackEvent,
} from '@/lib/analytics'
import {
  MAX_EXPIRATION_SECONDS,
  MAX_FILE_BYTES,
  MAX_FILE_CIPHER_BYTES,
  MAX_LINK_COUNT,
  MAX_TEXT_BYTES,
  MAX_TEXT_CIPHER_BYTES,
} from '@/islands/go/limits'
import { saveTrackLinks, type StoredTrackLink } from '@/islands/track-links'
import type { GoSecretStateApi } from './use-go-secret-state'

type EncryptedFile = {
  readonly body: Blob
  readonly chunkCount: number
  readonly chunkSize: number
  readonly encryptedSize: number
  readonly manifest: {
    readonly cipher: string
    readonly iv: string
    readonly salt: string
  }
  readonly secret: string
}

const textEncoder = new TextEncoder()

const byteLength = (value: string): number => {
  return textEncoder.encode(value).byteLength
}

const chunkToArrayBuffer = (chunk: Uint8Array): ArrayBuffer => {
  const buffer = new ArrayBuffer(chunk.byteLength)
  new Uint8Array(buffer).set(chunk)

  return buffer
}

const yieldToBrowser = async (): Promise<void> => {
  await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
}

const concatChunks = (chunks: readonly Uint8Array[]): Blob => {
  return new Blob(chunks.map(chunkToArrayBuffer), {
    type: 'application/octet-stream',
  })
}

const textLinks = (
  readIds: readonly string[],
  secret: string,
): readonly StoredTrackLink[] => {
  return readIds.map(readId => ({
    readId,
    value: encodeTextAccessUrl({
      origin: window.location.origin,
      readId,
      secret,
    }),
  }))
}

const fileLinks = (
  readIds: readonly string[],
  secret: string,
): readonly StoredTrackLink[] => {
  return readIds.map(readId => ({
    readId,
    value: encodeFileAccessUrl({
      origin: window.location.origin,
      readId,
      secret,
    }),
  }))
}

const trackLink = (trackId: string): string => {
  return `${window.location.origin}/track/${encodeURIComponent(trackId)}`
}

const validateSettings = ({
  expiresInSeconds,
  reads,
}: {
  readonly expiresInSeconds: number
  readonly reads: number
}): string | null => {
  if (!Number.isSafeInteger(expiresInSeconds) || expiresInSeconds <= 0) {
    return 'Choose a valid expiration.'
  }
  if (expiresInSeconds > MAX_EXPIRATION_SECONDS) {
    return `Expiration cannot exceed ${MAX_EXPIRATION_SECONDS} seconds.`
  }
  if (!Number.isSafeInteger(reads) || reads <= 0) {
    return 'Choose a valid read link count.'
  }
  if (reads > MAX_LINK_COUNT) return `Read links cannot exceed ${MAX_LINK_COUNT}.`

  return null
}

const openTrackPage = (trackId: string, links: readonly StoredTrackLink[]): void => {
  saveTrackLinks(trackId, links)
  window.location.assign(trackLink(trackId))
}

const encryptedFile = async ({
  file,
  onProgress,
}: {
  readonly file: File
  readonly onProgress: (status: string) => void
}): Promise<EncryptedFile> => {
  const secret = await createFileSecret()
  const chunkSize = defaultFileChunkSizeBytes
  const chunkCount = Math.max(1, Math.ceil(file.size / chunkSize))
  const manifest = await sealFileManifest({
    secret,
    manifest: {
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: file.size,
      lastModified: file.lastModified,
      chunkSize,
      chunkCount,
    },
  })
  const encryptedChunks: Uint8Array[] = []
  let encryptedSize = 0

  for (let chunkIndex = 0; chunkIndex < chunkCount; chunkIndex += 1) {
    const start = chunkIndex * chunkSize
    const end = Math.min(start + chunkSize, file.size)
    const chunk = new Uint8Array(await file.slice(start, end).arrayBuffer())
    const encrypted = await sealFileChunk({
      chunk,
      chunkIndex,
      chunkCount,
      chunkSize,
      salt: manifest.salt,
      secret,
    })
    encryptedChunks.push(encrypted)
    encryptedSize += encrypted.byteLength
    onProgress(`Encrypted ${chunkIndex + 1}/${chunkCount} chunks...`)
    await yieldToBrowser()
  }

  return {
    body: concatChunks(encryptedChunks),
    chunkCount,
    chunkSize,
    encryptedSize,
    manifest,
    secret,
  }
}

export const useSecretSubmit = ({ actions, state }: GoSecretStateApi) => {
  const { file, mode, settings, value } = state
  const { prepareSubmit, setBusy, setStatus } = actions

  return useCallback(async () => {
    prepareSubmit()
    let unlockOnFinish = true

    try {
      const expiresInSeconds = Number(settings.expiresInSeconds)
      const reads = Number(settings.reads)
      const baseCreateParams = {
        secret_type: mode,
        read_limit: reads,
        expiration_bucket: expirationBucket(expiresInSeconds),
      }
      const trackCreateError = (error: unknown): void => {
        trackEvent({
          name: 'create_secret_error',
          params: {
            secret_type: mode,
            error_type: analyticsErrorType(error),
          },
        })
      }
      const settingsError = validateSettings({ expiresInSeconds, reads })
      if (settingsError) {
        trackCreateError(settingsError)
        setStatus(settingsError)
        return
      }

      if (mode === 'file') {
        if (!file) {
          trackCreateError('missing_file')
          return
        }

        const fileSizeBucket = sizeBucket(file.size)
        if (file.size > MAX_FILE_BYTES) {
          const message = `Files are limited to ${formatBytes(MAX_FILE_BYTES)}.`
          trackCreateError(message)
          setStatus(message)
          return
        }

        trackEvent({
          name: 'create_secret_start',
          params: { ...baseCreateParams, size_bucket: fileSizeBucket },
        })
        const encrypted = await encryptedFile({
          file,
          onProgress: setStatus,
        })
        if (encrypted.encryptedSize > MAX_FILE_CIPHER_BYTES) {
          const message = `Encrypted files are limited to ${formatBytes(
            MAX_FILE_CIPHER_BYTES,
          )}.`
          trackCreateError(message)
          setStatus(message)
          return
        }

        setStatus('Initializing upload...')
        const init = await initFileSecret({
          encryptedManifest: encrypted.manifest.cipher,
          manifestIv: encrypted.manifest.iv,
          salt: encrypted.manifest.salt,
          plainSize: file.size,
          encryptedSize: encrypted.encryptedSize,
          chunkSize: encrypted.chunkSize,
          chunkCount: encrypted.chunkCount,
          expiresInSeconds,
          reads,
        })
        await uploadEncryptedFile({
          uploadUrl: init.uploadUrl,
          body: encrypted.body,
          onUploadProgress: event => {
            setStatus(
              transferStatus({
                verb: 'Uploading',
                progress: httpProgress(event),
              }),
            )
          },
        })
        setStatus('Completing upload...')
        const complete = await completeFileSecret({
          secretId: init.secretId,
          uploadToken: init.uploadToken,
        })
        trackEvent({
          name: 'create_secret_success',
          params: { ...baseCreateParams, size_bucket: fileSizeBucket },
        })
        setStatus('Opening tracking page...')
        openTrackPage(
          complete.trackId,
          fileLinks(complete.readIds, encrypted.secret),
        )
        unlockOnFinish = false
        return
      }

      const size = byteLength(value)
      const textSizeBucket = sizeBucket(size)
      if (size > MAX_TEXT_BYTES) {
        const message = `Text secrets are limited to ${formatBytes(MAX_TEXT_BYTES)}.`
        trackCreateError(message)
        setStatus(message)
        return
      }

      trackEvent({
        name: 'create_secret_start',
        params: { ...baseCreateParams, size_bucket: textSizeBucket },
      })
      const sealed = await sealText(value)
      const cipherSize = byteLength(sealed.cipher)
      if (cipherSize > MAX_TEXT_CIPHER_BYTES) {
        const message = `Encrypted text secrets are limited to ${formatBytes(
          MAX_TEXT_CIPHER_BYTES,
        )}.`
        trackCreateError(message)
        setStatus(message)
        return
      }

      const result = await createTextSecret({
        cipher: sealed.cipher,
        plainSize: size,
        expiresInSeconds,
        reads,
      })
      trackEvent({
        name: 'create_secret_success',
        params: { ...baseCreateParams, size_bucket: textSizeBucket },
      })
      setStatus('Opening tracking page...')
      openTrackPage(result.trackId, textLinks(result.readIds, sealed.secret))
      unlockOnFinish = false
    } catch (error) {
      trackEvent({
        name: 'create_secret_error',
        params: {
          secret_type: mode,
          error_type: analyticsErrorType(error),
        },
      })
      setStatus(error instanceof Error ? error.message : 'Unable to create secret.')
    } finally {
      if (unlockOnFinish) {
        setBusy(false)
      }
    }
  }, [
    file,
    mode,
    prepareSubmit,
    setBusy,
    setStatus,
    settings.expiresInSeconds,
    settings.reads,
    value,
  ])
}
