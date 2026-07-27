import { d1, r2 } from '@/storage'
import { d1Evm } from '@/storage/d1-evm'
import type { AppContext, CompleteFileInput, InitFileInput } from '@/types'
import {
  MAX_FILE_BYTES,
  MAX_FILE_CIPHER_BYTES,
  SECRET_ID_BYTES,
  TRACK_ID_BYTES,
  TRACKING_TTL_MS,
  UPLOAD_TOKEN_BYTES,
} from '@/utils/config'
import { ethRpcProvider } from '@/services/eth-rpc'
import { http } from '@/utils/http'
import { createReadIds, randomId } from '@/utils/ids'
import { ensureExpiresInSeconds, ensureReads } from '@/utils/validation'
import { evmAccessPolicy } from './access'

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let size = bytes / 1024
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }

  return `${size.toFixed(size >= 10 ? 1 : 2)} ${units[unitIndex]}`
}

const INSERT_FILE_SECRET_QUERY = [
  'INSERT INTO secrets',
  '(id, kind, status, r2_key, upload_token, salt, manifest_iv, encrypted_manifest, plain_size, encrypted_size, chunk_size, chunk_count, read_limit, expires_at, created_at)',
  "VALUES (?, 'file', 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
].join(' ')

const FIND_PENDING_FILE_SECRET_QUERY = [
  'SELECT id, r2_key, expires_at, read_limit',
  'FROM secrets',
  "WHERE id = ? AND kind = 'file' AND status = 'pending' AND upload_token = ?",
].join(' ')

const COMPLETE_FILE_SECRET_QUERY = [
  'UPDATE secrets',
  'SET status = ?, upload_token = NULL, track_id = ?, completed_at = ?, tracking_expires_at = ?',
  'WHERE id = ?',
].join(' ')

export const initFileSecret = async (c: AppContext): Promise<Response> => {
  const input = await c.req.json<InitFileInput>()
  const timestamp = Date.now()
  const expiresInSeconds = ensureExpiresInSeconds(input.expiresInSeconds)
  const reads = ensureReads(input.reads)
  if (!expiresInSeconds || !reads)
    return http.badRequest(c, 'Invalid expiration or read count.')
  const provider = ethRpcProvider(c.env)
  const accessPolicy = await evmAccessPolicy({
    db: c.env.DB,
    provider,
    timestamp,
    value: input.access,
    waitUntil: task => c.executionCtx.waitUntil(task),
  })
  if (accessPolicy === 'invalid')
    return http.badRequest(c, 'Invalid EVM access policy.')
  if (accessPolicy === 'conflict')
    return http.conflict(c, 'ENS name could not be resolved before creating.')
  if (accessPolicy === 'unsupported')
    return http.notImplemented(c, 'Ethereum RPC provider is not configured.')
  if (accessPolicy === 'unavailable')
    return http.badGateway(c, 'Ethereum RPC is unavailable.')
  if (accessPolicy === 'unsupported-account') return c.body(null, 400)
  const isMissingManifest = !input.encryptedManifest
  const isMissingManifestIv = !input.manifestIv
  const isMissingSalt = !input.salt
  const hasInvalidSize =
    typeof input.plainSize !== 'number' ||
    typeof input.encryptedSize !== 'number' ||
    !Number.isSafeInteger(input.plainSize) ||
    !Number.isSafeInteger(input.encryptedSize) ||
    input.plainSize < 0 ||
    input.encryptedSize <= 0
  const hasInvalidChunks =
    typeof input.chunkSize !== 'number' ||
    typeof input.chunkCount !== 'number' ||
    !Number.isSafeInteger(input.chunkSize) ||
    !Number.isSafeInteger(input.chunkCount) ||
    input.chunkSize <= 0 ||
    input.chunkCount <= 0
  const hasInvalidFileMetadata =
    isMissingManifest ||
    isMissingManifestIv ||
    isMissingSalt ||
    hasInvalidSize ||
    hasInvalidChunks
  if (hasInvalidFileMetadata) return http.badRequest(c, 'Invalid file metadata.')
  if (input.plainSize > MAX_FILE_BYTES)
    return http.badRequest(c, `Files are limited to ${formatBytes(MAX_FILE_BYTES)}.`)
  if (input.encryptedSize > MAX_FILE_CIPHER_BYTES) {
    return http.badRequest(
      c,
      `Encrypted files are limited to ${formatBytes(MAX_FILE_CIPHER_BYTES)}.`,
    )
  }

  const expiresAt = timestamp + expiresInSeconds * 1000
  const secretId = randomId(SECRET_ID_BYTES)
  const uploadToken = randomId(UPLOAD_TOKEN_BYTES)
  const r2Key = r2.fileObjectKey(secretId)
  const uploadUrl = await r2.presignUrl({
    env: c.env,
    method: 'PUT',
    key: r2Key,
  })
  await c.env.DB.prepare(INSERT_FILE_SECRET_QUERY)
    .bind(
      secretId,
      r2Key,
      uploadToken,
      input.salt,
      input.manifestIv,
      input.encryptedManifest,
      input.plainSize,
      input.encryptedSize,
      input.chunkSize,
      input.chunkCount,
      reads,
      expiresAt,
      timestamp,
    )
    .run()
  if (accessPolicy) {
    await d1Evm.insertPolicy({
      db: c.env.DB,
      secretId,
      policy: accessPolicy,
      createdAt: timestamp,
    })
  }

  return c.json({
    kind: 'file',
    secretId,
    uploadToken,
    uploadUrl,
    expiresAt,
  })
}

export const completeFileSecret = async (c: AppContext): Promise<Response> => {
  const input = await c.req.json<CompleteFileInput>()
  const secretId = c.req.param('secretId')
  if (!secretId) return http.notFound(c, 'Upload session not found.')

  const secret = await c.env.DB.prepare(FIND_PENDING_FILE_SECRET_QUERY)
    .bind(secretId, input.uploadToken)
    .first<{
      id: string
      r2_key: string
      expires_at: number
      read_limit: number
    }>()
  if (!secret) return http.notFound(c, 'Upload session not found.')
  const object = await c.env.FILES.head(secret.r2_key)
  if (!object) return http.conflict(c, 'Uploaded file object is not available yet.')
  const readIds = createReadIds(secret.read_limit)
  const timestamp = Date.now()
  const trackId = randomId(TRACK_ID_BYTES)
  await c.env.DB.prepare(COMPLETE_FILE_SECRET_QUERY)
    .bind('ready', trackId, timestamp, secret.expires_at + TRACKING_TTL_MS, secretId)
    .run()
  await d1.insertReadIds({
    db: c.env.DB,
    secretId,
    readIds,
    expiresAt: secret.expires_at,
  })
  const accessPolicy = await d1Evm.findPolicy(c.env.DB, secretId)
  if (accessPolicy) {
    const evmIds = await d1Evm.insertReadIds({
      db: c.env.DB,
      secretId,
      readIds,
      policy: accessPolicy,
      expiresAt: secret.expires_at,
      createdAt: timestamp,
    })

    return c.json({
      kind: 'file',
      evmIds,
      trackId,
      expiresAt: secret.expires_at,
    })
  }

  return c.json({
    kind: 'file',
    readIds,
    trackId,
    expiresAt: secret.expires_at,
  })
}
