import { bytesToBase64Url } from 'secret-cipher'
import { READ_ID_BYTES } from '@/utils/config'

export const randomId = (byteLength: number): string => {
  const bytes = new Uint8Array(byteLength)
  crypto.getRandomValues(bytes)
  return bytesToBase64Url(bytes)
}

export const createReadIds = (count: number): string[] => {
  return Array.from({ length: count }, () => randomId(READ_ID_BYTES))
}
