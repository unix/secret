import { MAX_EXPIRES_IN_SECONDS, MAX_READS } from '@/utils/config'

export const ensureExpiresInSeconds = (value: unknown): number | null => {
  if (typeof value !== 'number') return null
  if (!Number.isSafeInteger(value) || value <= 0) return null
  if (value > MAX_EXPIRES_IN_SECONDS) return null

  return value
}

export const ensureReads = (value: unknown): number | null => {
  if (typeof value !== 'number') return null
  if (!Number.isSafeInteger(value) || value <= 0) return null
  if (value > MAX_READS) return null

  return value
}
