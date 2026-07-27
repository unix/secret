import selfHost from '../../self-host'
import type { SecretMode } from '@/islands/go/types'

type AnalyticsParams = Record<string, number | string | undefined>

type AnalyticsEvent =
  | {
      readonly name: 'create_secret_start'
      readonly params: CreateSecretParams
    }
  | {
      readonly name: 'create_secret_success'
      readonly params: CreateSecretParams
    }
  | {
      readonly name: 'create_secret_error'
      readonly params: SecretErrorParams
    }
  | {
      readonly name: 'reveal_secret_success'
      readonly params: RevealSecretParams
    }
  | {
      readonly name: 'reveal_secret_error'
      readonly params: ErrorParams
    }
  | {
      readonly name: 'download_secret_file'
      readonly params: FileParams
    }

type CreateSecretParams = {
  readonly expiration_bucket: string
  readonly read_limit: number
  readonly secret_type: SecretMode
  readonly size_bucket?: string
}

type ErrorParams = {
  readonly error_type: string
}

type FileParams = {
  readonly size_bucket: string
}

type RevealSecretParams = {
  readonly secret_type: 'file' | 'text'
  readonly size_bucket?: string
}

type SecretErrorParams = ErrorParams & {
  readonly secret_type: SecretMode
}

type Gtag = (
  command: 'event',
  eventName: AnalyticsEvent['name'],
  params?: AnalyticsParams,
) => void

declare global {
  interface Window {
    readonly gtag?: Gtag
  }
}

const hasAnalytics = (): boolean => {
  return typeof selfHost.configs.ga4 === 'string' && selfHost.configs.ga4.length > 0
}

export const analyticsErrorType = (
  error: unknown,
  fallback = 'unknown_error',
): string => {
  const message =
    typeof error === 'string'
      ? error
      : error instanceof Error
        ? error.message
        : fallback
  const normalized = message
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64)

  return normalized || fallback
}

export const expirationBucket = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds <= 0) return 'invalid'
  if (seconds <= 300) return 'lte_5m'
  if (seconds <= 900) return 'lte_15m'
  if (seconds <= 1800) return 'lte_30m'
  if (seconds <= 3600) return 'lte_1h'
  if (seconds <= 86400) return 'lte_24h'
  return 'gt_24h'
}

export const sizeBucket = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes < 0) return 'unknown'
  if (bytes <= 1024) return 'lte_1kb'
  if (bytes <= 10 * 1024) return 'lte_10kb'
  if (bytes <= 100 * 1024) return 'lte_100kb'
  if (bytes <= 1024 * 1024) return 'lte_1mb'
  if (bytes <= 10 * 1024 * 1024) return 'lte_10mb'
  return 'gt_10mb'
}

export const trackEvent = (event: AnalyticsEvent): void => {
  if (!hasAnalytics()) return
  if (typeof window === 'undefined') return
  if (!window.gtag) return
  window.gtag('event', event.name, event.params)
}
