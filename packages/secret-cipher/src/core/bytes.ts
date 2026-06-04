import { ERRORS } from '../utils/constants'
import { CipherError } from '../utils/errors'

const BASE64URL_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'

const BASE64URL_PATTERN = /^[A-Za-z0-9_-]*$/

export const bytesToBase64Url = (bytes: Uint8Array): string => {
  let output = ''
  let index = 0

  for (; index + 2 < bytes.length; index += 3) {
    const value = (bytes[index] << 16) | (bytes[index + 1] << 8) | bytes[index + 2]
    output += BASE64URL_ALPHABET[(value >> 18) & 63]
    output += BASE64URL_ALPHABET[(value >> 12) & 63]
    output += BASE64URL_ALPHABET[(value >> 6) & 63]
    output += BASE64URL_ALPHABET[value & 63]
  }

  const remaining = bytes.length - index
  if (remaining === 1) {
    const value = bytes[index] << 16
    output += BASE64URL_ALPHABET[(value >> 18) & 63]
    output += BASE64URL_ALPHABET[(value >> 12) & 63]
  }

  if (remaining === 2) {
    const value = (bytes[index] << 16) | (bytes[index + 1] << 8)
    output += BASE64URL_ALPHABET[(value >> 18) & 63]
    output += BASE64URL_ALPHABET[(value >> 12) & 63]
    output += BASE64URL_ALPHABET[(value >> 6) & 63]
  }

  return output
}

export const base64UrlToBytes = (value: string): Uint8Array => {
  if (!BASE64URL_PATTERN.test(value) || value.length % 4 === 1) {
    throw new CipherError(ERRORS.INVALID_BASE64URL, 'Invalid base64url value.')
  }

  let buffer = 0
  let bits = 0
  const output: number[] = []

  for (const character of value) {
    const digit = BASE64URL_ALPHABET.indexOf(character)
    if (digit < 0) {
      throw new CipherError(ERRORS.INVALID_BASE64URL, 'Invalid base64url value.')
    }

    buffer = (buffer << 6) | digit
    bits += 6

    if (bits >= 8) {
      bits -= 8
      output.push((buffer >> bits) & 255)
    }
  }

  return Uint8Array.from(output)
}

export const concatBytes = (...chunks: readonly Uint8Array[]): Uint8Array => {
  const byteLength = chunks.reduce((total, chunk) => total + chunk.byteLength, 0)
  const output = new Uint8Array(byteLength)
  let offset = 0

  for (const chunk of chunks) {
    output.set(chunk, offset)
    offset += chunk.byteLength
  }

  return output
}

export const bytesToHex = (bytes: Uint8Array): string => {
  return [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

export const utf8ToBytes = (value: string): Uint8Array => {
  const Encoder = globalThis.TextEncoder
  if (typeof Encoder !== 'function') {
    throw new CipherError(
      ERRORS.ENVIRONMENT_UNAVAILABLE,
      'TextEncoder is unavailable in this environment.',
    )
  }

  return new Encoder().encode(value)
}

export const bytesToUtf8 = (bytes: Uint8Array): string => {
  const Decoder = globalThis.TextDecoder
  if (typeof Decoder !== 'function') {
    throw new CipherError(
      ERRORS.ENVIRONMENT_UNAVAILABLE,
      'TextDecoder is unavailable in this environment.',
    )
  }

  return new Decoder().decode(bytes)
}
