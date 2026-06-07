import axios, { type AxiosResponse } from 'axios'
import selfHost from '../../self-host'

type ApiErrorBody = {
  readonly error?: unknown
}

const textDecoder = new TextDecoder()

const LOCAL_API_BASE = '/__LOCAL__/api'
const LOCAL_HOST_PARTS = ['localhost', '127.0.0.1'] as const
const RATE_LIMIT_MESSAGE =
  'Requests are coming in too quickly. Please wait a minute and try again.'
const UNSUPPORTED_EVM_ACCOUNT_MESSAGE =
  'Contract addresses and smart wallets are not supported yet.'

const isLocalHost = (): boolean => {
  const hostname = globalThis.location?.hostname ?? ''

  return LOCAL_HOST_PARTS.some(part => hostname.includes(part))
}

const configuredApiOrigin = (): string => {
  const value = selfHost.configs.apiOrigin
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error('selfHost.configs.apiOrigin must be configured.')
  }

  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error('selfHost.configs.apiOrigin must be a valid URL origin.')
  }

  const isValidProtocol = url.protocol === 'https:' || url.protocol === 'http:'
  if (!isValidProtocol || url.origin !== value || url.pathname !== '/') {
    throw new Error('selfHost.configs.apiOrigin must be a valid URL origin.')
  }

  return value
}

const configuredApiBase = (): string => {
  return `${configuredApiOrigin()}/api`
}

export const API_BASE = isLocalHost() ? LOCAL_API_BASE : configuredApiBase()

export const apiClient = axios.create({
  adapter: 'xhr',
  baseURL: API_BASE,
})

export const transferClient = axios.create({
  adapter: 'xhr',
})

const isApiErrorBody = (value: unknown): value is ApiErrorBody => {
  return typeof value === 'object' && value !== null && 'error' in value
}

const arrayBufferErrorMessage = (data: ArrayBuffer): string | null => {
  if (data.byteLength === 0) return null

  const text = textDecoder.decode(data)
  try {
    const parsed: unknown = JSON.parse(text)
    if (isApiErrorBody(parsed) && typeof parsed.error === 'string') {
      return parsed.error
    }
  } catch {
    return text
  }

  return text
}

const isEmptyErrorData = (data: unknown): boolean => {
  if (data === undefined || data === null) return true
  if (typeof data === 'string') return data.length === 0
  if (data instanceof ArrayBuffer) return data.byteLength === 0

  return false
}

const errorMessage = (error: unknown): string | null => {
  if (!axios.isAxiosError(error)) return null

  if (error.response?.status === 429) {
    return RATE_LIMIT_MESSAGE
  }

  if (error.response?.status === 501) {
    return 'This deployment has not configured an Ethereum RPC provider yet.'
  }
  if (error.response?.status === 400 && isEmptyErrorData(error.response.data)) {
    return UNSUPPORTED_EVM_ACCOUNT_MESSAGE
  }

  const requestUrl = error.config?.url ?? ''
  if (
    error.code === 'ERR_NETWORK' &&
    requestUrl.includes('.r2.cloudflarestorage.com')
  ) {
    return 'Unable to reach R2. Check the bucket CORS policy for this origin.'
  }

  const data = error.response?.data
  if (data instanceof ArrayBuffer) return arrayBufferErrorMessage(data)
  if (isApiErrorBody(data) && typeof data.error === 'string') {
    return data.error
  }

  if (typeof data === 'string' && data.length > 0) return data
  if (error.message.length > 0) return error.message

  return null
}

export const responseData = async <T>(
  response: Promise<AxiosResponse<T>>,
  fallbackMessage: string,
): Promise<T> => {
  try {
    return (await response).data
  } catch (error) {
    throw new Error(errorMessage(error) ?? fallbackMessage)
  }
}
