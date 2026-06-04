import { ApiClientError } from './api'
import { yellow } from './terminal'

export class CliUserError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CliUserError'
  }
}

export const printExpectedError = (error: unknown): boolean => {
  if (!(error instanceof CliUserError || error instanceof ApiClientError)) {
    return false
  }

  console.log(yellow(error.message))

  return true
}
