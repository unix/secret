import { RUNTIME_NAMES } from './types'
import type { CipherRuntime, CipherRuntimeName, StandardCrypto } from './types'

const isRecord = (value: unknown): value is Record<PropertyKey, unknown> => {
  return typeof value === 'object' && value !== null
}

const hasFunction = (value: Record<PropertyKey, unknown>, key: string): boolean => {
  return typeof value[key] === 'function'
}

const isStandardCrypto = (value: unknown): value is StandardCrypto => {
  if (!isRecord(value) || !hasFunction(value, 'getRandomValues')) return false
  const subtle = value.subtle
  if (!isRecord(subtle)) return false

  return (
    hasFunction(subtle, 'digest') &&
    hasFunction(subtle, 'importKey') &&
    hasFunction(subtle, 'deriveBits') &&
    hasFunction(subtle, 'encrypt') &&
    hasFunction(subtle, 'decrypt')
  )
}

const assertByteLength = (byteLength: number): void => {
  if (!Number.isSafeInteger(byteLength) || byteLength <= 0) {
    throw new TypeError('byteLength must be a positive safe integer.')
  }
}

export const createWebStandardsRuntime = (
  cryptoValue: unknown = Reflect.get(globalThis, 'crypto'),
  name: CipherRuntimeName = RUNTIME_NAMES.WEB_STANDARDS,
): CipherRuntime | null => {
  if (!isStandardCrypto(cryptoValue)) return null
  const { subtle } = cryptoValue

  return {
    name,
    randomBytes(byteLength) {
      assertByteLength(byteLength)
      return cryptoValue.getRandomValues(new Uint8Array(byteLength))
    },
    async sha256(data) {
      return new Uint8Array(await subtle.digest('SHA-256', data))
    },
    async hkdfSha256({ key, salt, info, byteLength }) {
      assertByteLength(byteLength)
      const material = await subtle.importKey('raw', key, 'HKDF', false, [
        'deriveBits',
      ])
      const derived = await subtle.deriveBits(
        {
          name: 'HKDF',
          hash: 'SHA-256',
          salt,
          info,
        },
        material,
        byteLength * 8,
      )

      return new Uint8Array(derived)
    },
    async aesGcmEncrypt({ key, iv, plaintext, additionalData }) {
      const cryptoKey = await subtle.importKey('raw', key, 'AES-GCM', false, [
        'encrypt',
      ])
      const encrypted = await subtle.encrypt(
        {
          name: 'AES-GCM',
          iv,
          additionalData,
          tagLength: 128,
        },
        cryptoKey,
        plaintext,
      )

      return new Uint8Array(encrypted)
    },
    async aesGcmDecrypt({ key, iv, ciphertext, additionalData }) {
      const cryptoKey = await subtle.importKey('raw', key, 'AES-GCM', false, [
        'decrypt',
      ])
      const decrypted = await subtle.decrypt(
        {
          name: 'AES-GCM',
          iv,
          additionalData,
          tagLength: 128,
        },
        cryptoKey,
        ciphertext,
      )

      return new Uint8Array(decrypted)
    },
  }
}
