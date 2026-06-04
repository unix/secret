import { RUNTIME_NAMES } from '../runtimes/types'

export const ERRORS = {
  ENVIRONMENT_UNAVAILABLE: 'CR:environment-unavailable',
  INVALID_BASE64URL: 'CR:invalid-base64url',
  INVALID_CIPHERTEXT: 'CR:invalid-ciphertext',
  INVALID_KEY: 'CR:invalid-key',
  INVALID_NONCE: 'CR:invalid-nonce',
  INVALID_RUNTIME: 'CR:invalid-runtime',
  INVALID_URL: 'CR:invalid-url',
  OPERATION_FAILED: 'CR:operation-failed',
} as const

export const RUNTIME_PREFERENCE = {
  AUTO: 'auto',
  ...RUNTIME_NAMES,
} as const

export const CIPHER_FORMAT = {
  SEPARATOR: '.',
} as const

export const ACCESS_URL = {
  DEFAULT_BASE_PATH: '/s',
} as const

export const CRYPTO_BYTES = {
  AES_KEY: 32,
  IV: 12,
  SALT: 16,
} as const

export const SECRET_BYTES = {
  ACCESS: 32,
} as const

export const SECRET_CONTEXT = {
  PREFIX: 'secret-cipher:',
} as const
