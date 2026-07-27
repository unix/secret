import {
  DEFAULT_EXPIRATION_SECONDS,
  DEFAULT_LINK_COUNT,
  MAX_EXPIRATION_SECONDS,
  MAX_LINK_COUNT,
  VALID_EXPIRATIONS,
  VALID_LINK_COUNTS,
} from './constants'
import { CliUserError } from './expected-error'

export const optionString = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value
  return undefined
}

export const optionNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) return Number(value)
  return undefined
}

const includesNumber = (values: readonly number[], value: number): boolean => {
  return values.some(item => item === value)
}

export const expirationSeconds = (value: unknown): number => {
  const number = optionNumber(value) ?? DEFAULT_EXPIRATION_SECONDS
  if (includesNumber(VALID_EXPIRATIONS, number)) {
    if (number > MAX_EXPIRATION_SECONDS) {
      throw new CliUserError(
        `Expiration cannot exceed ${MAX_EXPIRATION_SECONDS} seconds.`,
      )
    }

    return number
  }

  throw new CliUserError(
    `Expiration must be one of ${VALID_EXPIRATIONS.join(', ')}.`,
  )
}

export const linkCount = (value: unknown): number => {
  const number = optionNumber(value) ?? DEFAULT_LINK_COUNT
  if (includesNumber(VALID_LINK_COUNTS, number)) {
    if (number > MAX_LINK_COUNT) {
      throw new CliUserError(`Links cannot exceed ${MAX_LINK_COUNT}.`)
    }

    return number
  }

  throw new CliUserError(`Links must be one of ${VALID_LINK_COUNTS.join(', ')}.`)
}
