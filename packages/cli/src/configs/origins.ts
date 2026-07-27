import { CliUserError } from '../utils/expected-error'

const defaultProtocol = (host: string): 'http' | 'https' => {
  if (
    host.startsWith('localhost') ||
    host.startsWith('127.') ||
    host.startsWith('[::1]')
  ) {
    return 'http'
  }

  return 'https'
}

export const normalizeOrigin = (host: string): string => {
  const value = host.trim()
  if (!value) throw new CliUserError('Host cannot be empty.')

  const withProtocol = /^[a-z][a-z\d+\-.]*:\/\//i.test(value)
    ? value
    : `${defaultProtocol(value)}://${value}`
  let url: URL
  try {
    url = new URL(withProtocol)
  } catch {
    throw new CliUserError(`Host is not a valid URL or hostname: ${host}`)
  }

  return url.origin
}
