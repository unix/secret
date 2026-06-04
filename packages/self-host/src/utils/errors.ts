export class SelfHostError extends Error {
  readonly code: string

  constructor(message: string, code = 'SELF-HOST-ERROR') {
    super(message)
    this.name = 'SelfHostError'
    this.code = code
  }
}
