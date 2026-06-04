export type SecretMode = 'text' | 'password' | 'file'

export type SecretSettings = {
  readonly expiresInSeconds: string
  readonly reads: string
}
