import { bytesToBase64Url } from 'secret-cipher'
import { READ_ID_BYTES } from '@/utils/config'

const ALPHANUMERIC_CHARS =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
const ALPHANUMERIC_RANDOM_LIMIT =
  Math.floor(256 / ALPHANUMERIC_CHARS.length) * ALPHANUMERIC_CHARS.length

export const randomId = (byteLength: number): string => {
  const bytes = new Uint8Array(byteLength)
  crypto.getRandomValues(bytes)
  return bytesToBase64Url(bytes)
}

export const randomAlphanumericId = (length: number): string => {
  let value = ''
  const bytes = new Uint8Array(length)

  while (value.length < length) {
    crypto.getRandomValues(bytes)
    bytes.forEach(byte => {
      if (value.length >= length || byte >= ALPHANUMERIC_RANDOM_LIMIT) return
      value += ALPHANUMERIC_CHARS[byte % ALPHANUMERIC_CHARS.length]
    })
  }

  return value
}

export const createReadIds = (count: number): string[] => {
  return Array.from({ length: count }, () => randomId(READ_ID_BYTES))
}
