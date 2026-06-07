import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CheckIcon,
  ClipboardCopyIcon,
  Download01Icon,
  File01Icon,
  ReloadIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  decodeFileAccessFragment,
  decodeTextAccessFragment,
  type FileManifest,
  type FileSecret,
  openFileChunk,
  openFileManifest,
  openText,
} from 'secret-cipher'
import { getAddress } from 'viem'
import { createSiweMessage } from 'viem/siwe'
import AppContent from '@/components/app-content'
import { httpProgress, transferStatus } from '@/apis/progress'
import {
  createEvmChallenge,
  downloadFileBytes,
  readSecret,
  verifyEvmAccess,
} from '@/apis/secrets'
import { Button } from '@/components/ui/button'
import { Loading } from '@/components/ui/loading'
import { analyticsErrorType, sizeBucket, trackEvent } from '@/lib/analytics'

const GCM_TAG_BYTES = 16
const MAINNET_CHAIN_ID = 1
const REVEAL_TEXT = 'Reveal Secret'
const OPENING_TEXT = 'Opening Secret...'
const DECRYPTION_CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*+-?'
const DECRYPTION_STEPS = 12
const USED_SECRET_ERROR = 'Secret link has already been used.'
const EXPIRED_SECRET_ERROR = 'Secret has expired.'
const WALLET_UNAVAILABLE_ERROR =
  'This secret requires Ethereum address verification. To continue, sign a wallet message with the required ETH address.\nNo Ethereum wallet environment was detected in this browser. Enable your wallet extension, or install an Ethereum wallet and try again.'
const WALLET_UNAVAILABLE_TITLE = 'Ethereum wallet required'
const WALLET_CONNECT_ERROR = 'Unable to connect to Ethereum wallet.'
const SIGNATURE_CANCELLED_ERROR = 'You cancelled the signature request.'
const WALLET_CONNECTION_CANCELLED_ERROR = 'You cancelled the wallet connection.'
const UNSUPPORTED_EVM_NETWORK_ERROR =
  'This link is not configured for Ethereum mainnet.'

type ReadStatusKind = 'error' | 'info' | 'loading' | 'success' | 'warning'

type ReadStatus = {
  readonly kind: ReadStatusKind
  readonly message: string
}

type OpenedSecret =
  | {
      readonly kind: 'text'
      readonly value: string
    }
  | {
      readonly fileSecret: FileSecret
      readonly kind: 'file'
      readonly manifest: FileManifest
      readonly readId: string
      readonly salt: string
    }

type EthereumProvider = {
  readonly request: (input: {
    readonly method: string
    readonly params?: readonly unknown[]
  }) => Promise<unknown>
}

type ReadSecretIslandProps =
  | {
      readonly evmId?: never
      readonly readId: string
    }
  | {
      readonly evmId: string
      readonly readId?: never
    }

declare global {
  interface Window {
    ethereum?: EthereumProvider
  }
}

const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

const chunkToArrayBuffer = (chunk: Uint8Array): ArrayBuffer => {
  const buffer = new ArrayBuffer(chunk.byteLength)
  new Uint8Array(buffer).set(chunk)

  return buffer
}

const randomCharacter = (): string => {
  return DECRYPTION_CHARACTERS[
    Math.floor(Math.random() * DECRYPTION_CHARACTERS.length)
  ]
}

const shuffledTextIndexes = (text: string): number[] => {
  const indexes = [...text]
    .map((character, index) => (character === ' ' ? -1 : index))
    .filter(index => index >= 0)

  for (let index = indexes.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    const value = indexes[index]
    indexes[index] = indexes[swapIndex]
    indexes[swapIndex] = value
  }

  return indexes
}

const decryptedTextFrame = (text: string, revealedIndexes: Set<number>): string => {
  return [...text]
    .map((character, index) => {
      if (character === ' ' || revealedIndexes.has(index)) return character

      return randomCharacter()
    })
    .join('')
}

const fileExtension = (manifest: FileManifest): string => {
  const extension = manifest.name.split('.').pop()
  if (extension && extension !== manifest.name) return extension.toUpperCase()
  if (manifest.type) return manifest.type.split('/')[0]?.toUpperCase() ?? 'FILE'

  return 'FILE'
}

const formatFileSize = (size: number): string => {
  if (size < 1024) return `${size} B`

  const units = ['KB', 'MB', 'GB', 'TB'] as const
  let value = size / 1024
  let unitIndex = 0

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`
}

const formatFileMeta = (manifest: FileManifest): string => {
  const parts = [fileExtension(manifest), formatFileSize(manifest.size)]
  if (manifest.type) parts.push(manifest.type)
  if (manifest.lastModified) {
    parts.push(new Date(manifest.lastModified).toLocaleDateString())
  }

  return parts.join(' · ')
}

const isUnavailableSecretError = (message: string): boolean => {
  return message === USED_SECRET_ERROR || message === EXPIRED_SECRET_ERROR
}

const isTerminalRevealError = (message: string): boolean => {
  return isUnavailableSecretError(message) || message === WALLET_UNAVAILABLE_ERROR
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return value !== null && typeof value === 'object'
}

const errorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message
  if (isRecord(error) && typeof error.message === 'string') return error.message

  return ''
}

const walletErrorCode = (error: unknown): number | string | null => {
  if (!isRecord(error)) return null
  const { code } = error
  if (typeof code === 'number' || typeof code === 'string') return code

  return null
}

const isUserRejectedRequest = (error: unknown): boolean => {
  const code = walletErrorCode(error)
  if (code === 4001 || code === '4001' || code === 'ACTION_REJECTED') return true

  return /cancel|denied|reject/i.test(errorMessage(error))
}

const walletRequestError = (error: unknown, fallback: string): Error => {
  const message = errorMessage(error)
  if (!message) return new Error(fallback)

  return new Error(`${fallback} ${message}`)
}

const walletAddress = async (): Promise<`0x${string}`> => {
  const provider = window.ethereum
  if (!provider) {
    throw new Error(WALLET_UNAVAILABLE_ERROR)
  }

  let accounts: unknown
  try {
    accounts = await provider.request({ method: 'eth_requestAccounts' })
  } catch (error) {
    if (isUserRejectedRequest(error)) {
      throw new Error(WALLET_CONNECTION_CANCELLED_ERROR)
    }

    throw walletRequestError(error, WALLET_CONNECT_ERROR)
  }
  if (!Array.isArray(accounts) || typeof accounts[0] !== 'string') {
    throw new Error('Ethereum wallet did not return an address.')
  }

  return getAddress(accounts[0])
}

const personalSign = async ({
  address,
  message,
}: {
  readonly address: `0x${string}`
  readonly message: string
}): Promise<string> => {
  const provider = window.ethereum
  if (!provider) {
    throw new Error(WALLET_UNAVAILABLE_ERROR)
  }

  let signature: unknown
  try {
    signature = await provider.request({
      method: 'personal_sign',
      params: [message, address],
    })
  } catch (error) {
    if (isUserRejectedRequest(error)) {
      throw new Error(SIGNATURE_CANCELLED_ERROR)
    }

    throw walletRequestError(error, 'Unable to sign the wallet message.')
  }
  if (typeof signature !== 'string') {
    throw new Error('Ethereum wallet did not return a signature.')
  }

  return signature
}

const requestEvmReadId = async (
  evmId: string,
  onStatus: (status: ReadStatus) => void,
): Promise<string> => {
  onStatus({ kind: 'loading', message: 'Waiting for wallet connection...' })
  const address = await walletAddress()
  onStatus({ kind: 'loading', message: 'Preparing signature request...' })
  const challenge = await createEvmChallenge(evmId, {
    origin: window.location.origin,
  })
  if (challenge.chainId !== MAINNET_CHAIN_ID) {
    throw new Error(UNSUPPORTED_EVM_NETWORK_ERROR)
  }

  const message = createSiweMessage({
    address,
    chainId: challenge.chainId,
    domain: challenge.domain,
    expirationTime: new Date(challenge.expiresAt),
    issuedAt: new Date(challenge.issuedAt),
    nonce: challenge.nonce,
    statement: challenge.statement,
    uri: challenge.uri,
    version: challenge.version,
  })
  onStatus({ kind: 'loading', message: 'Waiting for wallet signature...' })
  const signature = await personalSign({ address, message })
  onStatus({ kind: 'loading', message: 'Verifying signature...' })
  const result = await verifyEvmAccess({
    evmId,
    challengeId: challenge.challengeId,
    message,
    signature,
  })

  return result.readId
}

const readStatusKind = (message: string): ReadStatusKind => {
  if (
    message === SIGNATURE_CANCELLED_ERROR ||
    message === WALLET_CONNECTION_CANCELLED_ERROR ||
    isUnavailableSecretError(message)
  ) {
    return 'warning'
  }
  if (
    message === WALLET_UNAVAILABLE_ERROR ||
    message.startsWith(WALLET_CONNECT_ERROR) ||
    message === UNSUPPORTED_EVM_NETWORK_ERROR
  ) {
    return 'error'
  }

  return 'error'
}

const StatusMessage = ({ status }: { readonly status: ReadStatus }) => {
  if (status.kind === 'loading') {
    return (
      <Loading
        label={status.message}
        className="text-xs leading-5 text-muted-foreground"
      />
    )
  }

  if (status.message === WALLET_UNAVAILABLE_ERROR) {
    return (
      <div role="alert" className="mx-auto max-w-[480px] space-y-7">
        <div className="text-center">
          <span className="inline-flex rounded-full bg-red-50 px-3 py-1 font-mono text-sm leading-5 text-red-500">
            {WALLET_UNAVAILABLE_TITLE}
          </span>
        </div>
        <div className="space-y-2 text-left text-sm leading-5 text-zinc-500">
          {status.message.split('\n').map(message => (
            <p key={message}>{message}</p>
          ))}
        </div>
      </div>
    )
  }

  if (status.kind === 'error' || status.kind === 'warning') {
    const className = status.kind === 'error' ? 'text-red-700' : 'text-amber-700'

    return (
      <div
        role="alert"
        className={`mx-auto max-w-[420px] whitespace-pre-line text-center text-xs leading-5 ${className}`}>
        {status.message}
      </div>
    )
  }

  return (
    <p className="text-center text-xs leading-5 text-muted-foreground">
      {status.message}
    </p>
  )
}

const RevealSecretButton = ({
  busy,
  disabled,
  onReveal,
}: {
  busy: boolean
  disabled: boolean
  onReveal: () => void
}) => {
  const frameRef = useRef<number | null>(null)
  const [label, setLabel] = useState(REVEAL_TEXT)

  useEffect(() => {
    if (!busy) return

    setLabel(OPENING_TEXT)
  }, [busy])

  useEffect(() => {
    return () => {
      if (frameRef.current === null) return

      window.clearInterval(frameRef.current)
    }
  }, [])

  const decryptLabel = () => {
    if (busy || disabled) return

    if (frameRef.current !== null) {
      window.clearInterval(frameRef.current)
    }

    let frame = 0
    const revealOrder = shuffledTextIndexes(REVEAL_TEXT)
    setLabel(decryptedTextFrame(REVEAL_TEXT, new Set()))
    frameRef.current = window.setInterval(() => {
      frame += 1
      const revealedCount = Math.ceil(
        (frame / DECRYPTION_STEPS) * revealOrder.length,
      )
      setLabel(
        decryptedTextFrame(
          REVEAL_TEXT,
          new Set(revealOrder.slice(0, revealedCount)),
        ),
      )
      if (frame < DECRYPTION_STEPS) return

      if (frameRef.current !== null) {
        window.clearInterval(frameRef.current)
        frameRef.current = null
      }
      setLabel(REVEAL_TEXT)
    }, 34)
  }

  return (
    <button
      type="button"
      disabled={busy || disabled}
      onClick={onReveal}
      onFocus={decryptLabel}
      onMouseEnter={decryptLabel}
      className="bg-transparent p-0 font-mono text-sm font-normal leading-6 text-black underline decoration-black/45 decoration-[1px] decoration-dashed underline-offset-4 transition-colors hover:decoration-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/18 focus-visible:ring-offset-4 disabled:cursor-not-allowed disabled:text-black/35 disabled:line-through disabled:decoration-black/25 disabled:hover:decoration-black/25">
      {label}
    </button>
  )
}

const OpenedTextSecret = ({ value }: { readonly value: string }) => {
  const [copied, setCopied] = useState(false)

  const copySecret = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={copySecret}
          className="rounded-md border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950">
          <HugeiconsIcon
            icon={copied ? CheckIcon : ClipboardCopyIcon}
            strokeWidth={1.7}
          />
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
      <pre
        aria-label="Opened secret"
        className="min-h-32 overflow-auto whitespace-pre-wrap rounded-[3px] border border-zinc-200 bg-white p-4 font-mono text-sm leading-6 text-zinc-950 shadow-xs">
        <code>{value}</code>
      </pre>
    </div>
  )
}

const OpenedFileSecret = ({
  fileSecret,
  manifest,
  readId,
  salt,
  onStatus,
  onUsed,
}: {
  readonly fileSecret: FileSecret
  readonly manifest: FileManifest
  readonly readId: string
  readonly salt: string
  readonly onStatus: (status: ReadStatus) => void
  readonly onUsed: () => void
}) => {
  const frameRef = useRef<number | null>(null)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null)
  const [downloaded, setDownloaded] = useState(false)

  useEffect(() => {
    return () => {
      if (frameRef.current === null) return

      window.clearInterval(frameRef.current)
    }
  }, [])

  const downloadLocalBlob = (localBlob: Blob) => {
    if (frameRef.current !== null) {
      window.clearInterval(frameRef.current)
    }

    setDownloaded(false)
    setDownloadProgress(0)
    let progress = 0
    frameRef.current = window.setInterval(() => {
      progress = Math.min(progress + 20, 100)
      setDownloadProgress(progress)
      if (progress < 100) return

      if (frameRef.current !== null) {
        window.clearInterval(frameRef.current)
        frameRef.current = null
      }
      downloadBlob(localBlob, manifest.name)
      trackEvent({
        name: 'download_secret_file',
        params: { size_bucket: sizeBucket(manifest.size) },
      })
      setDownloaded(true)
      setDownloadProgress(null)
      onStatus({ kind: 'success', message: 'File downloaded.' })
      window.setTimeout(() => {
        setDownloaded(false)
      }, 1500)
    }, 80)
  }

  const decryptFile = async (encrypted: Uint8Array): Promise<Blob> => {
    const chunks: Uint8Array[] = []
    let offset = 0
    for (let chunkIndex = 0; chunkIndex < manifest.chunkCount; chunkIndex += 1) {
      const isLast = chunkIndex === manifest.chunkCount - 1
      const plaintextLength = isLast
        ? manifest.size - manifest.chunkSize * chunkIndex
        : manifest.chunkSize
      const ciphertextLength = plaintextLength + GCM_TAG_BYTES
      const chunk = encrypted.slice(offset, offset + ciphertextLength)
      chunks.push(
        await openFileChunk({
          ciphertext: chunk,
          chunkIndex,
          chunkCount: manifest.chunkCount,
          plaintextLength,
          chunkSize: manifest.chunkSize,
          salt,
          secret: fileSecret,
        }),
      )
      offset += ciphertextLength
      onStatus({
        kind: 'loading',
        message: `Decrypted ${chunkIndex + 1}/${manifest.chunkCount} chunks...`,
      })
    }

    return new Blob(chunks.map(chunkToArrayBuffer), { type: manifest.type })
  }

  const download = async () => {
    if (blob) {
      downloadLocalBlob(blob)
      return
    }

    setDownloaded(false)
    setDownloadProgress(0)
    try {
      const encrypted = new Uint8Array(
        await downloadFileBytes(readId, event => {
          const progress = httpProgress(event)
          setDownloadProgress(
            progress.percent === null ? 0 : Math.round(progress.percent * 100),
          )
          onStatus({
            kind: 'loading',
            message: transferStatus({
              verb: 'Downloading',
              progress,
            }),
          })
        }),
      )
      onStatus({ kind: 'loading', message: 'Decrypting file...' })
      const localBlob = await decryptFile(encrypted)
      setBlob(localBlob)
      downloadBlob(localBlob, manifest.name)
      trackEvent({
        name: 'download_secret_file',
        params: { size_bucket: sizeBucket(manifest.size) },
      })
      setDownloaded(true)
      onStatus({ kind: 'success', message: 'File downloaded.' })
      window.setTimeout(() => {
        setDownloaded(false)
      }, 1500)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to download file.'
      onStatus({ kind: readStatusKind(message), message })
      if (isUnavailableSecretError(message)) {
        onUsed()
      }
    } finally {
      setDownloadProgress(null)
    }
  }

  const downloadStatus =
    downloadProgress === null
      ? downloaded
        ? 'Downloaded'
        : formatFileMeta(manifest)
      : `Downloading ${downloadProgress}%`

  return (
    <div className="mx-auto flex max-w-[560px] items-center gap-3 rounded-lg bg-zinc-100/80 p-3 shadow-xs ring-1 ring-zinc-200">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-white text-zinc-500">
        <HugeiconsIcon icon={File01Icon} strokeWidth={1.7} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-950">{manifest.name}</p>
        <p className="mt-0.5 truncate text-xs leading-5 text-zinc-500">
          {downloadStatus}
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={
          downloadProgress === null
            ? `Download ${manifest.name}`
            : `Downloading ${downloadProgress}%`
        }
        disabled={downloadProgress !== null}
        onClick={download}
        className="size-8 shrink-0 rounded-md border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50 hover:text-zinc-950">
        <HugeiconsIcon
          icon={downloadProgress === null ? Download01Icon : ReloadIcon}
          strokeWidth={1.7}
          className={downloadProgress === null ? undefined : 'animate-spin'}
        />
      </Button>
    </div>
  )
}

export const ReadSecretIsland = (props: ReadSecretIslandProps) => {
  const [status, setStatus] = useState<ReadStatus | null>(null)
  const [openedSecret, setOpenedSecret] = useState<OpenedSecret | null>(null)
  const [busy, setBusy] = useState(false)
  const [used, setUsed] = useState(false)
  const accessFragment = useMemo(() => {
    if (typeof window === 'undefined') return null

    return window.location.hash
  }, [])

  const reveal = async () => {
    if (!accessFragment) {
      trackEvent({
        name: 'reveal_secret_error',
        params: { error_type: 'missing_secret_fragment' },
      })
      setStatus({
        kind: 'error',
        message: 'This link is missing its secret fragment.',
      })
      return
    }

    const textAccess = decodeTextAccessFragment(accessFragment)
    const fileAccess = decodeFileAccessFragment(accessFragment)
    if (!textAccess || !fileAccess) {
      trackEvent({
        name: 'reveal_secret_error',
        params: { error_type: 'invalid_secret_fragment' },
      })
      setStatus({
        kind: 'error',
        message: 'This link has an invalid secret fragment.',
      })
      return
    }

    setBusy(true)
    setStatus({
      kind: 'loading',
      message: props.evmId
        ? 'Waiting for wallet verification...'
        : 'Opening secret...',
    })
    setOpenedSecret(null)
    setUsed(false)
    try {
      const readId = props.evmId
        ? await requestEvmReadId(props.evmId, setStatus)
        : props.readId
      if (!readId) {
        throw new Error('Secret link is missing its read id.')
      }

      setStatus({ kind: 'loading', message: 'Opening encrypted secret...' })
      const secret = await readSecret(readId)
      if (secret.kind === 'text') {
        setStatus({ kind: 'loading', message: 'Decrypting text secret...' })
        const value = await openText({
          cipher: secret.cipher,
          secret: textAccess.secret,
        })
        setOpenedSecret({ kind: 'text', value })
        trackEvent({
          name: 'reveal_secret_success',
          params: { secret_type: 'text' },
        })
        setStatus({ kind: 'success', message: 'Secret opened.' })
        return
      }

      setStatus({ kind: 'loading', message: 'Opening file information...' })
      const manifest = await openFileManifest({
        salt: secret.manifest.salt,
        iv: secret.manifest.iv,
        cipher: secret.manifest.cipher,
        secret: fileAccess.secret,
      })
      setOpenedSecret({
        fileSecret: fileAccess.secret,
        kind: 'file',
        manifest,
        readId,
        salt: secret.manifest.salt,
      })
      trackEvent({
        name: 'reveal_secret_success',
        params: {
          secret_type: 'file',
          size_bucket: sizeBucket(manifest.size),
        },
      })
      setStatus({ kind: 'success', message: 'File information opened.' })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to open secret.'
      trackEvent({
        name: 'reveal_secret_error',
        params: { error_type: analyticsErrorType(error) },
      })
      setStatus({ kind: readStatusKind(message), message })
      setUsed(isTerminalRevealError(message))
    } finally {
      setBusy(false)
    }
  }

  const revealButton = (
    <RevealSecretButton busy={busy} disabled={used} onReveal={reveal} />
  )

  return (
    <AppContent>
      <div className="space-y-5">
        {!openedSecret && <div className="text-center">{revealButton}</div>}
        {!openedSecret && status && <StatusMessage status={status} />}
        {openedSecret && (
          <>
            {status && <StatusMessage status={status} />}
            {openedSecret.kind === 'text' ? (
              <OpenedTextSecret value={openedSecret.value} />
            ) : (
              <OpenedFileSecret
                fileSecret={openedSecret.fileSecret}
                manifest={openedSecret.manifest}
                readId={openedSecret.readId}
                salt={openedSecret.salt}
                onStatus={setStatus}
                onUsed={() => setUsed(true)}
              />
            )}
          </>
        )}
      </div>
    </AppContent>
  )
}
