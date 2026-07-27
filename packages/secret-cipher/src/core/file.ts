import {
  base64UrlToBytes,
  bytesToBase64Url,
  bytesToUtf8,
  utf8ToBytes,
} from './bytes'
import { CRYPTO_BYTES, ERRORS, SECRET_CONTEXT } from '../utils/constants'
import { CipherError } from '../utils/errors'
import { resolveCipherRuntime } from '../runtimes'
import {
  assertSafeNonNegativeInteger,
  assertSafePositiveInteger,
} from './shared/assert'
import { decodeAccessUrl, encodeAccessUrl } from './shared/access-url'
import { deriveKey } from './shared/crypto'
import { createSecret, parseSecret, secretFromString } from './shared/secret'
import type { CipherRuntimeOptions } from '../types'

const DEFAULT_FILE_CHUNK_SIZE_BYTES = 8 * 1024 * 1024

const FILE_INFO = utf8ToBytes(`${SECRET_CONTEXT.PREFIX}file-key`)
const MANIFEST_INFO = utf8ToBytes(`${SECRET_CONTEXT.PREFIX}file-manifest-key`)
const NONCE_INFO = utf8ToBytes(`${SECRET_CONTEXT.PREFIX}file-chunk-nonce`)
const MANIFEST_AAD = utf8ToBytes(`${SECRET_CONTEXT.PREFIX}file-manifest`)

export type FileSecret = string

export type FileAccessFragment = string

export type FileAccessUrl = string

export type FileManifest = {
  readonly name: string
  readonly type: string
  readonly size: number
  readonly lastModified?: number
  readonly chunkSize: number
  readonly chunkCount: number
}

export type SealFileManifestInput = CipherRuntimeOptions & {
  readonly manifest: FileManifest
  readonly secret: FileSecret | string
  readonly salt?: string
}

export type SealFileManifestResult = {
  readonly salt: string
  readonly iv: string
  readonly cipher: string
}

export type OpenFileManifestInput = CipherRuntimeOptions & {
  readonly salt: string
  readonly iv: string
  readonly cipher: string
  readonly secret: FileSecret | string
}

export type SealFileChunkInput = CipherRuntimeOptions & {
  readonly chunk: Uint8Array
  readonly chunkIndex: number
  readonly chunkCount: number
  readonly chunkSize?: number
  readonly salt: string
  readonly secret: FileSecret | string
}

export type OpenFileChunkInput = CipherRuntimeOptions & {
  readonly ciphertext: Uint8Array
  readonly chunkIndex: number
  readonly chunkCount: number
  readonly plaintextLength: number
  readonly chunkSize?: number
  readonly salt: string
  readonly secret: FileSecret | string
}

export type EncodeFileAccessUrlInput = {
  readonly readId: string
  readonly secret: FileSecret | string
  readonly origin?: string
  readonly basePath?: string
}

export type DecodedFileAccessFragment = {
  readonly secret: FileSecret
}

export type DecodedFileAccessUrl = DecodedFileAccessFragment & {
  readonly readId: string
}

export const defaultFileChunkSizeBytes = DEFAULT_FILE_CHUNK_SIZE_BYTES

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return value !== null && typeof value === 'object'
}

const isSafeNonNegativeInteger = (value: unknown): value is number => {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

const isSafePositiveInteger = (value: unknown): value is number => {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
}

const fileManifestFromValue = (value: unknown): FileManifest => {
  if (
    isRecord(value) &&
    typeof value.name === 'string' &&
    typeof value.type === 'string' &&
    isSafeNonNegativeInteger(value.size) &&
    isSafePositiveInteger(value.chunkSize) &&
    isSafePositiveInteger(value.chunkCount) &&
    (value.lastModified === undefined ||
      isSafeNonNegativeInteger(value.lastModified))
  ) {
    return {
      name: value.name,
      type: value.type,
      size: value.size,
      lastModified: value.lastModified,
      chunkSize: value.chunkSize,
      chunkCount: value.chunkCount,
    }
  }

  throw new CipherError(ERRORS.INVALID_CIPHERTEXT, 'Invalid file manifest.')
}

export const createFileSecret = async (
  options: CipherRuntimeOptions = {},
): Promise<FileSecret> => {
  return createSecret(options)
}

export const fileSecretFromString = (value: string): FileSecret => {
  return secretFromString(value)
}

export const encodeFileAccessFragment = (
  secret: FileSecret | string,
): FileAccessFragment => {
  return `#${fileSecretFromString(secret)}`
}

export const decodeFileAccessFragment = (
  fragment: string,
): DecodedFileAccessFragment | null => {
  const value = fragment.startsWith('#') ? fragment.slice(1) : fragment
  if (!value) return null

  try {
    return {
      secret: fileSecretFromString(value),
    }
  } catch {
    return null
  }
}

export const encodeFileAccessUrl = ({
  readId,
  origin,
  basePath,
  secret,
}: EncodeFileAccessUrlInput): FileAccessUrl => {
  return encodeAccessUrl({
    readId,
    origin,
    basePath,
    fragment: encodeFileAccessFragment(secret),
  })
}

export const decodeFileAccessUrl = (
  input: string,
  { basePath }: { readonly basePath?: string } = {},
): DecodedFileAccessUrl | null => {
  return decodeAccessUrl({
    input,
    basePath,
    decodeFragment: decodeFileAccessFragment,
  })
}

export const sealFileManifest = async ({
  manifest,
  secret,
  salt,
  runtime,
  preferredRuntime,
}: SealFileManifestInput): Promise<SealFileManifestResult> => {
  const cipherRuntime = await resolveCipherRuntime({ runtime, preferredRuntime })
  const saltBytes = salt
    ? base64UrlToBytes(salt)
    : cipherRuntime.randomBytes(CRYPTO_BYTES.SALT)
  const iv = cipherRuntime.randomBytes(CRYPTO_BYTES.IV)
  const key = await deriveKey({
    info: MANIFEST_INFO,
    salt: saltBytes,
    secret: parseSecret(secret),
    runtime: cipherRuntime,
  })
  const cipher = await cipherRuntime.aesGcmEncrypt({
    key,
    iv,
    plaintext: utf8ToBytes(JSON.stringify(manifest)),
    additionalData: MANIFEST_AAD,
  })

  return {
    salt: bytesToBase64Url(saltBytes),
    iv: bytesToBase64Url(iv),
    cipher: bytesToBase64Url(cipher),
  }
}

export const openFileManifest = async ({
  salt,
  iv,
  cipher,
  secret,
  runtime,
  preferredRuntime,
}: OpenFileManifestInput): Promise<FileManifest> => {
  const cipherRuntime = await resolveCipherRuntime({ runtime, preferredRuntime })
  const key = await deriveKey({
    info: MANIFEST_INFO,
    salt: base64UrlToBytes(salt),
    secret: parseSecret(secret),
    runtime: cipherRuntime,
  })

  try {
    const plaintext = await cipherRuntime.aesGcmDecrypt({
      key,
      iv: base64UrlToBytes(iv),
      ciphertext: base64UrlToBytes(cipher),
      additionalData: MANIFEST_AAD,
    })

    const manifest: unknown = JSON.parse(bytesToUtf8(plaintext))
    return fileManifestFromValue(manifest)
  } catch (error) {
    throw new CipherError(
      ERRORS.OPERATION_FAILED,
      'Unable to decrypt file manifest.',
      {
        cause: error,
      },
    )
  }
}

const nonceFromIndex = (nonceBase: Uint8Array, chunkIndex: number): Uint8Array => {
  if (nonceBase.byteLength !== CRYPTO_BYTES.IV) {
    throw new CipherError(ERRORS.INVALID_NONCE, `Expected ${CRYPTO_BYTES.IV} bytes.`)
  }

  const output = new Uint8Array(nonceBase)
  let value = BigInt(chunkIndex)
  for (let index = CRYPTO_BYTES.IV - 1; index >= 0; index -= 1) {
    output[index] ^= Number(value & 0xffn)
    value >>= 8n
  }

  return output
}

const chunkAdditionalData = ({
  chunkIndex,
  chunkCount,
  chunkSize,
  plaintextLength,
}: {
  readonly chunkIndex: number
  readonly chunkCount: number
  readonly chunkSize: number
  readonly plaintextLength: number
}): Uint8Array => {
  return utf8ToBytes(
    `${SECRET_CONTEXT.PREFIX}file-chunk:${chunkIndex}:${chunkCount}:${chunkSize}:${plaintextLength}`,
  )
}

export const sealFileChunk = async ({
  chunk,
  chunkIndex,
  chunkCount,
  chunkSize = DEFAULT_FILE_CHUNK_SIZE_BYTES,
  salt,
  secret,
  runtime,
  preferredRuntime,
}: SealFileChunkInput): Promise<Uint8Array> => {
  assertSafeNonNegativeInteger(chunkIndex, 'chunkIndex')
  assertSafePositiveInteger(chunkCount, 'chunkCount')
  assertSafePositiveInteger(chunkSize, 'chunkSize')
  const cipherRuntime = await resolveCipherRuntime({ runtime, preferredRuntime })
  const saltBytes = base64UrlToBytes(salt)
  const secretBytes = parseSecret(secret)
  const fileKey = await deriveKey({
    info: FILE_INFO,
    salt: saltBytes,
    secret: secretBytes,
    runtime: cipherRuntime,
  })
  const nonceBase = await cipherRuntime.hkdfSha256({
    key: secretBytes,
    salt: saltBytes,
    info: NONCE_INFO,
    byteLength: CRYPTO_BYTES.IV,
  })

  return cipherRuntime.aesGcmEncrypt({
    key: fileKey,
    iv: nonceFromIndex(nonceBase, chunkIndex),
    plaintext: chunk,
    additionalData: chunkAdditionalData({
      chunkIndex,
      chunkCount,
      chunkSize,
      plaintextLength: chunk.byteLength,
    }),
  })
}

export const openFileChunk = async ({
  ciphertext,
  chunkIndex,
  chunkCount,
  plaintextLength,
  chunkSize = DEFAULT_FILE_CHUNK_SIZE_BYTES,
  salt,
  secret,
  runtime,
  preferredRuntime,
}: OpenFileChunkInput): Promise<Uint8Array> => {
  assertSafeNonNegativeInteger(chunkIndex, 'chunkIndex')
  assertSafePositiveInteger(chunkCount, 'chunkCount')
  assertSafePositiveInteger(chunkSize, 'chunkSize')
  assertSafeNonNegativeInteger(plaintextLength, 'plaintextLength')
  const cipherRuntime = await resolveCipherRuntime({ runtime, preferredRuntime })
  const saltBytes = base64UrlToBytes(salt)
  const secretBytes = parseSecret(secret)
  const fileKey = await deriveKey({
    info: FILE_INFO,
    salt: saltBytes,
    secret: secretBytes,
    runtime: cipherRuntime,
  })
  const nonceBase = await cipherRuntime.hkdfSha256({
    key: secretBytes,
    salt: saltBytes,
    info: NONCE_INFO,
    byteLength: CRYPTO_BYTES.IV,
  })

  return cipherRuntime.aesGcmDecrypt({
    key: fileKey,
    iv: nonceFromIndex(nonceBase, chunkIndex),
    ciphertext,
    additionalData: chunkAdditionalData({
      chunkIndex,
      chunkCount,
      chunkSize,
      plaintextLength,
    }),
  })
}
