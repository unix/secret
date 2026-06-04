import { SelfHostError } from '@/utils/errors'
import { requireConfig } from './config'
import type { PreflightCheck } from './types'

const REQUIRED_POSITIVE_NUMBER_LIMITS = [
  'HYBRID_MAX_TEXT_BYTES',
  'HYBRID_MAX_TEXT_CIPHER_BYTES',
  'HYBRID_MAX_FILE_MB',
  'HYBRID_MAX_FILE_CIPHER_MB',
  'HYBRID_MAX_READS',
  'HYBRID_MAX_SECRET_TTL_SECONDS',
  'API_PENDING_UPLOAD_TTL_SECONDS',
  'API_TRACKING_TTL_SECONDS',
  'API_R2_UPLOAD_URL_TTL_SECONDS',
] as const

export const limitsPreflight: PreflightCheck = {
  label: 'limits',
  run: async context => {
    const { limits } = requireConfig(context)

    for (const key of REQUIRED_POSITIVE_NUMBER_LIMITS) {
      assertPositiveNumber(limits[key], key)
    }
    const expirations = assertPositiveNumberArray(
      limits.CLIENT_VALID_EXPIRATIONS_SECONDS,
      'CLIENT_VALID_EXPIRATIONS_SECONDS',
    )
    const linkCounts = assertPositiveNumberArray(
      limits.CLIENT_VALID_LINK_COUNTS,
      'CLIENT_VALID_LINK_COUNTS',
    )
    const maxTtl = limits.HYBRID_MAX_SECRET_TTL_SECONDS as number
    const maxReads = limits.HYBRID_MAX_READS as number

    assertMax(expirations, maxTtl, 'CLIENT_VALID_EXPIRATIONS_SECONDS')
    assertMax(linkCounts, maxReads, 'CLIENT_VALID_LINK_COUNTS')
  },
}

function assertPositiveNumber(value: unknown, key: string): void {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return

  throw new SelfHostError(`secret.config.json limits.${key} must be a positive number.`)
}

function assertPositiveNumberArray(value: unknown, key: string): readonly number[] {
  if (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      item => typeof item === 'number' && Number.isFinite(item) && item > 0,
    )
  ) {
    return value
  }

  throw new SelfHostError(
    `secret.config.json limits.${key} must be a non-empty array of positive numbers.`,
  )
}

function assertMax(values: readonly number[], max: number, key: string): void {
  const actual = Math.max(...values)
  if (actual <= max) return

  throw new SelfHostError(
    `secret.config.json limits.${key} has a maximum value of ${actual}, which exceeds the HYBRID limit of ${max}.`,
  )
}
