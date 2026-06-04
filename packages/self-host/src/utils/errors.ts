export class SelfHostError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SelfHostError'
  }
}
