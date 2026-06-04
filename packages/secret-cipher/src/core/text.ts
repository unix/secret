import { bytesToUtf8, utf8ToBytes } from './bytes'
import { CRYPTO_BYTES, ERRORS, SECRET_CONTEXT } from '../utils/constants'
import { CipherError } from '../utils/errors'
import { resolveCipherRuntime } from '../runtimes'
import { decodeAccessUrl, encodeAccessUrl } from './shared/access-url'
import { deriveKey, encodeCipherPayload, parseCipherPayload } from './shared/crypto'
import { createSecret, parseSecret, secretFromString } from './shared/secret'

import type { CipherRuntimeOptions } from '../types'

const TEXT_INFO = utf8ToBytes(`${SECRET_CONTEXT.PREFIX}text-key`)
const TEXT_AAD = utf8ToBytes(`${SECRET_CONTEXT.PREFIX}text`)

export type TextSecret = string & { readonly __brand: 'TextSecret' }

export type TextCiphertext = string & { readonly __brand: 'TextCiphertext' }

export type TextAccessFragment = string & {
  readonly __brand: 'TextAccessFragment'
}

export type TextAccessUrl = string & { readonly __brand: 'TextAccessUrl' }

export type SealTextOptions = CipherRuntimeOptions & {
  readonly secret?: TextSecret | string
}

export type SealTextResult = {
  readonly cipher: TextCiphertext
  readonly secret: TextSecret
}

export type OpenTextInput = CipherRuntimeOptions & {
  readonly cipher: TextCiphertext | string
  readonly secret: TextSecret | string
}

export type EncodeTextAccessUrlInput = {
  readonly readId: string
  readonly secret: TextSecret | string
  readonly origin?: string
  readonly basePath?: string
}

export type DecodedTextAccessFragment = {
  readonly secret: TextSecret
}

export type DecodedTextAccessUrl = DecodedTextAccessFragment & {
  readonly readId: string
}

export const createTextSecret = async (
  options: CipherRuntimeOptions = {},
): Promise<TextSecret> => {
  return createSecret<TextSecret>(options)
}

export const textSecretFromString = (value: string): TextSecret => {
  return secretFromString<TextSecret>(value)
}

export const sealText = async (
  text: string,
  options: SealTextOptions = {},
): Promise<SealTextResult> => {
  const runtime = await resolveCipherRuntime(options)
  const secret = options.secret
    ? textSecretFromString(options.secret)
    : await createTextSecret({ runtime })
  const secretBytes = parseSecret(secret)
  const salt = runtime.randomBytes(CRYPTO_BYTES.SALT)
  const iv = runtime.randomBytes(CRYPTO_BYTES.IV)
  const key = await deriveKey({
    info: TEXT_INFO,
    salt,
    secret: secretBytes,
    runtime,
  })
  const ciphertext = await runtime.aesGcmEncrypt({
    key,
    iv,
    plaintext: utf8ToBytes(text),
    additionalData: TEXT_AAD,
  })

  return {
    cipher: encodeCipherPayload({ salt, iv, ciphertext }) as TextCiphertext,
    secret,
  }
}

export const openText = async ({
  cipher,
  secret,
  runtime,
  preferredRuntime,
}: OpenTextInput): Promise<string> => {
  const cipherRuntime = await resolveCipherRuntime({ runtime, preferredRuntime })
  const payload = parseCipherPayload(cipher)
  const key = await deriveKey({
    info: TEXT_INFO,
    salt: payload.salt,
    secret: parseSecret(secret),
    runtime: cipherRuntime,
  })

  try {
    const plaintext = await cipherRuntime.aesGcmDecrypt({
      key,
      iv: payload.iv,
      ciphertext: payload.ciphertext,
      additionalData: TEXT_AAD,
    })

    return bytesToUtf8(plaintext)
  } catch (error) {
    throw new CipherError(ERRORS.OPERATION_FAILED, 'Unable to decrypt text.', {
      cause: error,
    })
  }
}

export const encodeTextAccessFragment = (
  secret: TextSecret | string,
): TextAccessFragment => {
  return `#${textSecretFromString(secret)}` as TextAccessFragment
}

export const decodeTextAccessFragment = (
  fragment: string,
): DecodedTextAccessFragment | null => {
  const value = fragment.startsWith('#') ? fragment.slice(1) : fragment
  if (!value) return null

  try {
    return {
      secret: textSecretFromString(value),
    }
  } catch {
    return null
  }
}

export const encodeTextAccessUrl = ({
  readId,
  origin,
  basePath,
  secret,
}: EncodeTextAccessUrlInput): TextAccessUrl => {
  return encodeAccessUrl({
    readId,
    origin,
    basePath,
    fragment: encodeTextAccessFragment(secret),
  }) as TextAccessUrl
}

export const decodeTextAccessUrl = (
  input: string,
  { basePath }: { readonly basePath?: string } = {},
): DecodedTextAccessUrl | null => {
  return decodeAccessUrl({
    input,
    basePath,
    decodeFragment: decodeTextAccessFragment,
  })
}
