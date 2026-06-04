import selfHost from '../../self-host'

const MB_BYTES = 1024 * 1024

export const MAX_TEXT_BYTES = selfHost.limits.HYBRID_MAX_TEXT_BYTES
export const MAX_TEXT_CIPHER_BYTES = selfHost.limits.HYBRID_MAX_TEXT_CIPHER_BYTES
export const MAX_FILE_BYTES = selfHost.limits.HYBRID_MAX_FILE_MB * MB_BYTES
export const MAX_FILE_CIPHER_BYTES =
  selfHost.limits.HYBRID_MAX_FILE_CIPHER_MB * MB_BYTES
export const MAX_READS = selfHost.limits.HYBRID_MAX_READS
export const MAX_EXPIRES_IN_SECONDS = selfHost.limits.HYBRID_MAX_SECRET_TTL_SECONDS
export const PENDING_TTL_MS = selfHost.limits.API_PENDING_UPLOAD_TTL_SECONDS * 1000
export const TRACKING_TTL_MS = selfHost.limits.API_TRACKING_TTL_SECONDS * 1000
export const READ_ID_BYTES = 16
export const SECRET_ID_BYTES = 16
export const TRACK_ID_BYTES = 24
export const UPLOAD_TOKEN_BYTES = 24
export const R2_UPLOAD_EXPIRES_SECONDS =
  selfHost.limits.API_R2_UPLOAD_URL_TTL_SECONDS
