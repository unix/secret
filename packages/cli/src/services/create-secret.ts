import { Buffer } from 'node:buffer'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { basename } from 'node:path'
import {
  createFileSecret,
  defaultFileChunkSizeBytes,
  sealFileChunk,
  sealFileManifest,
  sealText,
} from 'secret-cipher'
import { Service } from 'func'
import { CONFIG_KEYS, configs } from '../configs'
import { ApiClient, type TransferProgress } from '../utils/api'
import {
  MAX_FILE_BYTES,
  MAX_FILE_CIPHER_BYTES,
  MAX_TEXT_BYTES,
  MAX_TEXT_CIPHER_BYTES,
} from '../utils/constants'
import { CliUserError } from '../utils/expected-error'
import { fileLinks, textLinks, trackUrl } from '../utils/links'
import { saveTrack } from '../utils/storage'

export type CreateSecretInput = {
  readonly expiresInSeconds: number
  readonly filePath?: string
  readonly onStatus?: (status: string) => void
  readonly reads: number
  readonly value?: string
}

export type CreatedSecret = {
  readonly trackId: string
  readonly trackUrl: string
  readonly links: readonly {
    readonly readId: string
    readonly value: string
  }[]
}

const textEncoder = new TextEncoder()

const percentStatus = (label: string, current: number, total: number): string => {
  return `${label} ${Math.round((current / total) * 100)}%...`
}

const transferStatus = (label: string, progress: TransferProgress): string => {
  if (progress.percent === null) return `${label}...`

  return `${label} ${Math.round(progress.percent * 100)}%...`
}

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`

  const units = ['KB', 'MB', 'GB']
  let size = bytes / 1024
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }

  return `${size.toFixed(size >= 10 ? 1 : 2)} ${units[unitIndex]}`
}

@Service()
export class CreateSecretService {
  private static ConcatChunks(chunks: readonly Uint8Array[]): Uint8Array {
    const length = chunks.reduce((total, chunk) => total + chunk.byteLength, 0)
    const output = new Uint8Array(length)
    let offset = 0
    chunks.forEach(chunk => {
      output.set(chunk, offset)
      offset += chunk.byteLength
    })

    return output
  }

  private static async StatFile(filePath: string) {
    try {
      const stats = await stat(filePath)
      if (stats.isFile()) return stats

      throw new CliUserError(`${filePath} is not a file.`)
    } catch (error) {
      if (error instanceof CliUserError) throw error
      if (error && typeof error === 'object' && 'code' in error) {
        if (error.code === 'ENOENT') {
          throw new CliUserError(`File not found: ${filePath}`)
        }
        if (error.code === 'EACCES' || error.code === 'EPERM') {
          throw new CliUserError(`Cannot read file: ${filePath}`)
        }
      }

      throw error
    }
  }

  async create(input: CreateSecretInput): Promise<CreatedSecret> {
    const endpoints = await configs.get(CONFIG_KEYS.ENDPOINTS)
    const api = new ApiClient({ apiOrigin: endpoints.apiOrigin })
    if (input.filePath !== undefined) {
      return this.createFile({
        api,
        expiresInSeconds: input.expiresInSeconds,
        filePath: input.filePath,
        onStatus: input.onStatus,
        portalOrigin: endpoints.portalOrigin,
        reads: input.reads,
      })
    }

    return this.createText({
      api,
      expiresInSeconds: input.expiresInSeconds,
      onStatus: input.onStatus,
      portalOrigin: endpoints.portalOrigin,
      reads: input.reads,
      value: input.value ?? '',
    })
  }

  private async createText({
    api,
    expiresInSeconds,
    onStatus,
    portalOrigin,
    reads,
    value,
  }: {
    readonly api: ApiClient
    readonly expiresInSeconds: number
    readonly onStatus?: (status: string) => void
    readonly portalOrigin: string
    readonly reads: number
    readonly value: string
  }): Promise<CreatedSecret> {
    const plainSize = textEncoder.encode(value).byteLength
    if (plainSize === 0) throw new CliUserError('Secret text cannot be empty.')
    if (plainSize > MAX_TEXT_BYTES) {
      throw new CliUserError(
        `Text secrets are limited to ${formatBytes(MAX_TEXT_BYTES)}.`,
      )
    }

    const sealed = await sealText(value)
    const cipherSize = textEncoder.encode(sealed.cipher).byteLength
    if (cipherSize > MAX_TEXT_CIPHER_BYTES) {
      throw new CliUserError(
        `Encrypted text secrets are limited to ${formatBytes(MAX_TEXT_CIPHER_BYTES)}.`,
      )
    }

    onStatus?.('Creating secret...')
    const created = await api.createText({
      cipher: sealed.cipher,
      plainSize,
      expiresInSeconds,
      reads,
    })
    const links = await textLinks(created.readIds, sealed.secret, portalOrigin)
    const createdTrackUrl = trackUrl(created.trackId, portalOrigin)
    await saveTrack({
      kind: 'text',
      trackId: created.trackId,
      trackUrl: createdTrackUrl,
      createdAt: Date.now(),
      links,
    })

    return {
      trackId: created.trackId,
      trackUrl: createdTrackUrl,
      links,
    }
  }

  private async createFile({
    api,
    expiresInSeconds,
    filePath,
    onStatus,
    portalOrigin,
    reads,
  }: {
    readonly api: ApiClient
    readonly expiresInSeconds: number
    readonly filePath: string
    readonly onStatus?: (status: string) => void
    readonly portalOrigin: string
    readonly reads: number
  }): Promise<CreatedSecret> {
    const stats = await CreateSecretService.StatFile(filePath)
    if (stats.size > MAX_FILE_BYTES) {
      throw new CliUserError(`Files are limited to ${formatBytes(MAX_FILE_BYTES)}.`)
    }

    const secret = await createFileSecret()
    const chunkSize = defaultFileChunkSizeBytes
    const chunkCount = Math.max(1, Math.ceil(stats.size / chunkSize))
    const manifest = await sealFileManifest({
      secret,
      manifest: {
        name: basename(filePath),
        type: 'application/octet-stream',
        size: stats.size,
        lastModified: stats.mtimeMs,
        chunkSize,
        chunkCount,
      },
    })
    const encryptedChunks: Uint8Array[] = []
    let encryptedSize = 0
    let chunkIndex = 0

    for await (const chunk of createReadStream(filePath, {
      highWaterMark: chunkSize,
    })) {
      if (!Buffer.isBuffer(chunk)) {
        throw new CliUserError('File stream returned an unexpected chunk type.')
      }

      const encrypted = await sealFileChunk({
        chunk: new Uint8Array(chunk),
        chunkIndex,
        chunkCount,
        chunkSize,
        salt: manifest.salt,
        secret,
      })
      encryptedChunks.push(encrypted)
      encryptedSize += encrypted.byteLength
      chunkIndex += 1
      onStatus?.(percentStatus('Encrypting file', chunkIndex, chunkCount))
    }

    if (stats.size === 0) {
      const encrypted = await sealFileChunk({
        chunk: new Uint8Array(),
        chunkIndex: 0,
        chunkCount,
        chunkSize,
        salt: manifest.salt,
        secret,
      })
      encryptedChunks.push(encrypted)
      encryptedSize += encrypted.byteLength
      onStatus?.(percentStatus('Encrypting file', 1, chunkCount))
    }

    if (encryptedSize > MAX_FILE_CIPHER_BYTES) {
      throw new CliUserError(
        `Encrypted files are limited to ${formatBytes(MAX_FILE_CIPHER_BYTES)}.`,
      )
    }

    onStatus?.('Preparing upload...')
    const init = await api.initFile({
      encryptedManifest: manifest.cipher,
      manifestIv: manifest.iv,
      salt: manifest.salt,
      plainSize: stats.size,
      encryptedSize,
      chunkSize,
      chunkCount,
      expiresInSeconds,
      reads,
    })
    onStatus?.('Uploading file 0%...')
    await api.uploadFile(
      init.uploadUrl,
      CreateSecretService.ConcatChunks(encryptedChunks),
      progress => {
        onStatus?.(transferStatus('Uploading file', progress))
      },
    )
    onStatus?.('Completing upload...')
    const complete = await api.completeFile({
      secretId: init.secretId,
      uploadToken: init.uploadToken,
    })
    const links = await fileLinks(complete.readIds, secret, portalOrigin)
    const completeTrackUrl = trackUrl(complete.trackId, portalOrigin)
    await saveTrack({
      kind: 'file',
      trackId: complete.trackId,
      trackUrl: completeTrackUrl,
      createdAt: Date.now(),
      links,
    })

    return {
      trackId: complete.trackId,
      trackUrl: completeTrackUrl,
      links,
    }
  }
}
