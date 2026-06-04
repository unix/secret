import type { AxiosProgressEvent } from 'axios'

import { apiClient, responseData, transferClient } from './http'

export type TextSecretResponse = {
  readonly readIds: readonly string[]
  readonly trackId: string
}

export type FileInitResponse = {
  readonly secretId: string
  readonly uploadToken: string
  readonly uploadUrl: string
}

export type FileCompleteResponse = {
  readonly readIds: readonly string[]
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
  readonly cipher: string
  readonly plainSize: number
  readonly expiresInSeconds: number
  readonly reads: number
}

type InitFileSecretInput = {
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

export const createTextSecret = async (
  input: CreateTextSecretInput,
): Promise<TextSecretResponse> => {
  return responseData(
    apiClient.post<TextSecretResponse>('/secrets/text', input),
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
}: CompleteFileSecretInput): Promise<FileCompleteResponse> => {
  return responseData(
    apiClient.post<FileCompleteResponse>(
      `/secrets/files/${encodeURIComponent(secretId)}/complete`,
      { uploadToken },
    ),
    'Unable to complete file upload.',
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
