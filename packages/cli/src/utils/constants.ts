import selfHost from '../../self-host'

export const LOCAL = {
  ENDPOINTS: {
    API_ORIGIN: 'http://localhost:3001',
    PORTAL_ORIGIN: 'http://localhost:3000',
  },
} as const

export const PRODUCTION = {
  ENDPOINTS: {
    API_ORIGIN: 'https://secret-api.witt.im',
    PORTAL_ORIGIN: 'https://secret.witt.im',
  },
} as const

const MB_BYTES = 1024 * 1024

export const DEFAULT_EXPIRATION_SECONDS =
  selfHost.limits.CLIENT_VALID_EXPIRATIONS_SECONDS[0]
export const DEFAULT_LINK_COUNT = selfHost.limits.CLIENT_VALID_LINK_COUNTS[0]
export const MAX_TEXT_BYTES = selfHost.limits.HYBRID_MAX_TEXT_BYTES
export const MAX_TEXT_CIPHER_BYTES = selfHost.limits.HYBRID_MAX_TEXT_CIPHER_BYTES
export const MAX_FILE_BYTES = selfHost.limits.HYBRID_MAX_FILE_MB * MB_BYTES
export const MAX_FILE_CIPHER_BYTES =
  selfHost.limits.HYBRID_MAX_FILE_CIPHER_MB * MB_BYTES
export const MAX_LINK_COUNT = selfHost.limits.HYBRID_MAX_READS
export const MAX_EXPIRATION_SECONDS = selfHost.limits.HYBRID_MAX_SECRET_TTL_SECONDS
export const VALID_EXPIRATIONS = selfHost.limits.CLIENT_VALID_EXPIRATIONS_SECONDS
export const VALID_LINK_COUNTS = selfHost.limits.CLIENT_VALID_LINK_COUNTS
export const CONFIG_DIR_NAME = '.secret-cli'
export const CONFIG_FILE_NAME = 'config'
export const TRACK_FILE_PREFIX = 'track-'
export const CLEANUP_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000
export const TRACK_RETENTION_MS = 7 * 24 * 60 * 60 * 1000
