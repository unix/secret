import { ERRORS } from '../../utils/constants'
import { CipherError } from '../../utils/errors'

export const assertSafePositiveInteger = (value: number, name: string): void => {
  if (Number.isSafeInteger(value) && value > 0) return

  throw new CipherError(
    ERRORS.OPERATION_FAILED,
    `${name} must be a positive integer.`,
  )
}

export const assertSafeNonNegativeInteger = (value: number, name: string): void => {
  if (Number.isSafeInteger(value) && value >= 0) return

  throw new CipherError(
    ERRORS.OPERATION_FAILED,
    `${name} must be a non-negative integer.`,
  )
}
