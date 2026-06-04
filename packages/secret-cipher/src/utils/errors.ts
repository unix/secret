import { ERRORS } from './constants'

export type CipherErrorCode = (typeof ERRORS)[keyof typeof ERRORS]

export class CipherError extends Error {
  readonly code: CipherErrorCode

  constructor(code: CipherErrorCode, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'CipherError'
    this.code = code
  }
}
