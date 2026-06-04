import selfHost from '../../../self-host'

const MB_BYTES = 1024 * 1024

export const MAX_TEXT_BYTES = selfHost.limits.HYBRID_MAX_TEXT_BYTES
export const MAX_TEXT_CIPHER_BYTES = selfHost.limits.HYBRID_MAX_TEXT_CIPHER_BYTES
export const MAX_FILE_BYTES = selfHost.limits.HYBRID_MAX_FILE_MB * MB_BYTES
export const MAX_FILE_CIPHER_BYTES =
  selfHost.limits.HYBRID_MAX_FILE_CIPHER_MB * MB_BYTES
export const MAX_LINK_COUNT = selfHost.limits.HYBRID_MAX_READS
export const MAX_EXPIRATION_SECONDS = selfHost.limits.HYBRID_MAX_SECRET_TTL_SECONDS
export const VALID_EXPIRATIONS = selfHost.limits.CLIENT_VALID_EXPIRATIONS_SECONDS
export const VALID_LINK_COUNTS = selfHost.limits.CLIENT_VALID_LINK_COUNTS
export const DEFAULT_EXPIRATION_SECONDS = VALID_EXPIRATIONS[0]
export const DEFAULT_LINK_COUNT = VALID_LINK_COUNTS[0]
