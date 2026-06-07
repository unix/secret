import type { AxiosProgressEvent } from 'axios'
import { apiClient, responseData, transferClient } from './http'

export type TextSecretResponse = {
  readonly expiresAt: number
  readonly readIds: readonly string[]
  readonly trackId: string
}

export type EvmTextSecretResponse = {
  readonly evmIds: readonly string[]
  readonly expiresAt: number
  readonly trackId: string
}

export type FileInitResponse = {
  readonly secretId: string
  readonly uploadToken: string
  readonly uploadUrl: string
}

export type FileCompleteResponse = {
  readonly expiresAt: number
  readonly readIds: readonly string[]
  readonly trackId: string
}

export type EvmFileCompleteResponse = {
  readonly evmIds: readonly string[]
  readonly expiresAt: number
  readonly trackId: string
}

export type TrackSecretResponse = {
  readonly kind: 'text' | 'file'
  readonly status: 'pending' | 'ready' | 'destroyed' | 'expired'
  readonly createdAt: number
  readonly completedAt: number | null
  readonly expiresAt: number
  readonly destroyedAt: number | null
  readonly readLimit: number
  readonly remainingReads: number
  readonly reads: readonly {
    readonly readId: string
    readonly consumedAt: number | null
  }[]
}

export type SecretResponse =
  | {
      readonly kind: 'text'
      readonly cipher: string
    }
  | {
      readonly kind: 'file'
      readonly manifest: {
        readonly salt: string
        readonly iv: string
        readonly cipher: string
        readonly chunkSize: number
        readonly chunkCount: number
        readonly encryptedSize: number
      }
    }

type CreateTextSecretInput = {
  readonly access?: EvmAccessInput
  readonly cipher: string
  readonly plainSize: number
  readonly expiresInSeconds: number
  readonly reads: number
}

type InitFileSecretInput = {
  readonly access?: EvmAccessInput
  readonly chunkCount: number
  readonly chunkSize: number
  readonly encryptedManifest: string
  readonly encryptedSize: number
  readonly expiresInSeconds: number
  readonly manifestIv: string
  readonly plainSize: number
  readonly reads: number
  readonly salt: string
}

type ProgressHandler = (event: AxiosProgressEvent) => void

type UploadEncryptedFileInput = {
  readonly body: Blob
  readonly onUploadProgress?: ProgressHandler
  readonly uploadUrl: string
}

type CompleteFileSecretInput = {
  readonly secretId: string
  readonly uploadToken: string
}

export type EvmAccessInput = {
  readonly chainId: 1
  readonly type: 'evm'
} & (
  | {
      readonly address: `0x${string}`
      readonly ens?: never
    }
  | {
      readonly address?: never
      readonly ens: string
    }
)

export type EnsResolutionResponse = {
  readonly address: `0x${string}` | null
  readonly cacheHit: boolean
  readonly error: string | null
  readonly name: string
  readonly resolvedAt: number
  readonly status: 'resolved' | 'unresolved' | 'invalid' | 'error'
}

export type EvmChallengeResponse = {
  readonly challengeId: string
  readonly chainId: number
  readonly domain: string
  readonly expiresAt: string
  readonly issuedAt: string
  readonly nonce: string
  readonly statement: string
  readonly uri: string
  readonly version: '1'
}

export type EvmVerifyResponse = {
  readonly readId: string
}

type CreateEvmChallengeInput = {
  readonly origin: string
}

export const createTextSecret = async (
  input: CreateTextSecretInput,
): Promise<TextSecretResponse | EvmTextSecretResponse> => {
  return responseData(
    apiClient.post<TextSecretResponse | EvmTextSecretResponse>(
      '/secrets/text',
      input,
    ),
    'Unable to create text secret.',
  )
}

export const initFileSecret = async (
  input: InitFileSecretInput,
): Promise<FileInitResponse> => {
  return responseData(
    apiClient.post<FileInitResponse>('/secrets/files/init', input),
    'Unable to initialize file upload.',
  )
}

export const uploadEncryptedFile = async ({
  body,
  onUploadProgress,
  uploadUrl,
}: UploadEncryptedFileInput): Promise<void> => {
  await responseData(
    transferClient.put(uploadUrl, body, {
      onUploadProgress,
    }),
    'Unable to upload encrypted file.',
  )
}

export const completeFileSecret = async ({
  secretId,
  uploadToken,
}: CompleteFileSecretInput): Promise<
  FileCompleteResponse | EvmFileCompleteResponse
> => {
  return responseData(
    apiClient.post<FileCompleteResponse | EvmFileCompleteResponse>(
      `/secrets/files/${encodeURIComponent(secretId)}/complete`,
      { uploadToken },
    ),
    'Unable to complete file upload.',
  )
}

export const createEvmChallenge = async (
  evmId: string,
  input: CreateEvmChallengeInput,
): Promise<EvmChallengeResponse> => {
  return responseData(
    apiClient.post<EvmChallengeResponse>(
      `/chains/evm/${encodeURIComponent(evmId)}/challenge`,
      input,
    ),
    'Unable to create EVM verification challenge.',
  )
}

export const resolveEnsName = async (
  name: string,
): Promise<EnsResolutionResponse> => {
  return responseData(
    apiClient.post<EnsResolutionResponse>('/chains/evm/resolve-ens', { name }),
    'Unable to resolve ENS name.',
  )
}

export const verifyEvmAddressStatus = async (
  address: `0x${string}`,
): Promise<void> => {
  await responseData(
    apiClient.get<void>(
      `/chains/evm/addresses/${encodeURIComponent(address)}/status`,
    ),
    'Contract addresses and smart wallets are not supported yet.',
  )
}

export const verifyEvmAccess = async ({
  challengeId,
  evmId,
  message,
  signature,
}: {
  readonly challengeId: string
  readonly evmId: string
  readonly message: string
  readonly signature: string
}): Promise<EvmVerifyResponse> => {
  return responseData(
    apiClient.post<EvmVerifyResponse>(
      `/chains/evm/${encodeURIComponent(evmId)}/verify`,
      {
        challengeId,
        message,
        signature,
      },
    ),
    'Unable to verify EVM access.',
  )
}

export const readSecret = async (readId: string): Promise<SecretResponse> => {
  return responseData(
    apiClient.get<SecretResponse>(`/secrets/${encodeURIComponent(readId)}`),
    'Secret is unavailable or already used.',
  )
}

export const trackSecret = async (trackId: string): Promise<TrackSecretResponse> => {
  return responseData(
    apiClient.get<TrackSecretResponse>(
      `/secrets/track/${encodeURIComponent(trackId)}`,
    ),
    'Unable to load secret tracking.',
  )
}

export const downloadFileBytes = async (
  readId: string,
  onDownloadProgress?: ProgressHandler,
): Promise<ArrayBuffer> => {
  return responseData(
    apiClient.get<ArrayBuffer>(`/secrets/${encodeURIComponent(readId)}/file`, {
      onDownloadProgress,
      responseType: 'arraybuffer',
    }),
    'Unable to download encrypted file.',
  )
}
