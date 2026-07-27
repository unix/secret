import { ApiClientError } from './api'
import { errorLine } from './terminal'

export class CliUserError extends Error {
  readonly code: string

  constructor(message: string, code = 'USER-ERROR') {
    super(message)
    this.name = 'CliUserError'
    this.code = code
  }
}

export const printExpectedError = (error: unknown): boolean => {
  if (!(error instanceof CliUserError || error instanceof ApiClientError))
    return false
  console.error(errorLine(error.code, error.message))
  return true
}
