import type { Bindings, ReadSecretRow } from '@/types'
import { PENDING_TTL_MS, TRACKING_TTL_MS } from '@/utils/config'
import { retryD1Read } from '@/storage/d1-retry'

const insertReadIds = async ({
  db,
  secretId,
  readIds,
  expiresAt,
}: {
  readonly db: D1Database
  readonly secretId: string
  readonly readIds: readonly string[]
  readonly expiresAt: number
}): Promise<void> => {
  await db.batch(
    readIds.map(readId =>
      db
        .prepare(
          'INSERT INTO secret_reads (read_id, secret_id, expires_at) VALUES (?, ?, ?)',
        )
        .bind(readId, secretId, expiresAt),
    ),
  )
}

const trackingExpiresAt = (expiresAt: number, timestamp: number): number => {
  return Math.max(expiresAt, timestamp) + TRACKING_TTL_MS
}

const remainingReads = async (db: D1Database, secretId: string): Promise<number> => {
  const result = await retryD1Read(() =>
    db
      .prepare(
        'SELECT COUNT(*) AS count FROM secret_reads WHERE secret_id = ? AND consumed_at IS NULL',
      )
      .bind(secretId)
      .first<{ count: number }>(),
  )

  return result?.count ?? 0
}

const deleteSecretRecord = async (
  db: D1Database,
  secretId: string,
): Promise<void> => {
  await db.batch([
    db.prepare('DELETE FROM secret_reads WHERE secret_id = ?').bind(secretId),
    db.prepare('DELETE FROM secrets WHERE id = ?').bind(secretId),
  ])
}

const fileCleanupRecord = async (
  db: D1Database,
  secretId: string,
): Promise<{ r2_key: string | null } | null> => {
  return await retryD1Read(() =>
    db
      .prepare('SELECT r2_key FROM secrets WHERE id = ?')
      .bind(secretId)
      .first<{ r2_key: string | null }>(),
  )
}

const deleteSecretAndFileRecord = async (
  env: Bindings,
  secretId: string,
): Promise<void> => {
  const secret = await fileCleanupRecord(env.DB, secretId)
  if (secret?.r2_key) {
    await env.FILES.delete(secret.r2_key)
  }

  await deleteSecretRecord(env.DB, secretId)
}

const destroySecretContent = async ({
  deleteFileObject,
  env,
  secretId,
  timestamp,
}: {
  readonly deleteFileObject: boolean
  readonly env: Bindings
  readonly secretId: string
  readonly timestamp: number
}): Promise<void> => {
  const secret = await retryD1Read(() =>
    env.DB.prepare('SELECT kind, r2_key, expires_at FROM secrets WHERE id = ?')
      .bind(secretId)
      .first<{
        kind: 'text' | 'file'
        r2_key: string | null
        expires_at: number
      }>(),
  )
  if (!secret) return

  if (deleteFileObject && secret.kind === 'file' && secret.r2_key) {
    await env.FILES.delete(secret.r2_key)
  }

  const nextR2Key = deleteFileObject ? null : secret.r2_key
  await env.DB.prepare(
    [
      'UPDATE secrets',
      'SET status = ?, text_cipher = NULL, r2_key = ?, upload_token = NULL,',
      'salt = NULL, manifest_iv = NULL, encrypted_manifest = NULL,',
      'destroyed_at = COALESCE(destroyed_at, ?), tracking_expires_at = ?',
      'WHERE id = ?',
    ].join(' '),
  )
    .bind(
      'destroyed',
      nextR2Key,
      timestamp,
      trackingExpiresAt(secret.expires_at, timestamp),
      secretId,
    )
    .run()
}

const findSecretByReadId = async (
  db: D1Database,
  readId: string,
): Promise<ReadSecretRow | null> => {
  return await retryD1Read(() =>
    db
      .prepare(
        [
          'SELECT',
          'secret_reads.read_id, secret_reads.consumed_at,',
          'secrets.id, secrets.kind, secrets.status, secrets.text_cipher, secrets.r2_key, secrets.upload_token,',
          'secrets.salt, secrets.manifest_iv, secrets.encrypted_manifest,',
          'secrets.plain_size, secrets.encrypted_size, secrets.chunk_size, secrets.chunk_count, secrets.read_limit,',
          'secrets.track_id, secrets.expires_at, secrets.created_at, secrets.completed_at,',
          'secrets.destroyed_at, secrets.tracking_expires_at',
          'FROM secret_reads',
          'JOIN secrets ON secrets.id = secret_reads.secret_id',
          'WHERE secret_reads.read_id = ?',
        ].join(' '),
      )
      .bind(readId)
      .first<ReadSecretRow>(),
  )
}

export type TrackSecretRow = {
  readonly id: string
  readonly kind: 'text' | 'file'
  readonly status: 'pending' | 'ready' | 'destroyed'
  readonly read_limit: number
  readonly expires_at: number
  readonly created_at: number
  readonly completed_at: number | null
  readonly destroyed_at: number | null
}

export type TrackReadRow = {
  readonly read_id: string
  readonly consumed_at: number | null
}

const findSecretByTrackId = async (
  db: D1Database,
  trackId: string,
): Promise<TrackSecretRow | null> => {
  return await retryD1Read(() =>
    db
      .prepare(
        [
          'SELECT id, kind, status, read_limit, expires_at, created_at, completed_at, destroyed_at',
          'FROM secrets',
          'WHERE track_id = ?',
        ].join(' '),
      )
      .bind(trackId)
      .first<TrackSecretRow>(),
  )
}

const findReadRowsBySecretId = async (
  db: D1Database,
  secretId: string,
): Promise<readonly TrackReadRow[]> => {
  const result = await retryD1Read(() =>
    db
      .prepare(
        [
          'SELECT read_id, consumed_at',
          'FROM secret_reads',
          'WHERE secret_id = ?',
          'ORDER BY read_id',
        ].join(' '),
      )
      .bind(secretId)
      .all<TrackReadRow>(),
  )

  return result.results
}

const consumeReadId = async (
  db: D1Database,
  readId: string,
  timestamp: number,
): Promise<D1Result> => {
  return await db
    .prepare(
      'UPDATE secret_reads SET consumed_at = ? WHERE read_id = ? AND consumed_at IS NULL',
    )
    .bind(timestamp, readId)
    .run()
}

const destroyReadyExpiredRecords = async (
  env: Bindings,
  timestamp: number,
): Promise<void> => {
  const expired = await retryD1Read(() =>
    env.DB.prepare(
      "SELECT id FROM secrets WHERE status = 'ready' AND expires_at <= ? LIMIT 100",
    )
      .bind(timestamp)
      .all<{ id: string }>(),
  )

  for (const secret of expired.results) {
    await destroySecretContent({
      deleteFileObject: true,
      env,
      secretId: secret.id,
      timestamp,
    })
  }
}

const deleteTrackingExpiredRecords = async (
  env: Bindings,
  timestamp: number,
): Promise<void> => {
  const expired = await retryD1Read(() =>
    env.DB.prepare(
      [
        'SELECT id',
        'FROM secrets',
        "WHERE status = 'destroyed'",
        'AND tracking_expires_at IS NOT NULL',
        'AND tracking_expires_at <= ?',
        'LIMIT 100',
      ].join(' '),
    )
      .bind(timestamp)
      .all<{ id: string }>(),
  )

  for (const secret of expired.results) {
    await deleteSecretAndFileRecord(env, secret.id)
  }
}

const deletePendingRecords = async (
  env: Bindings,
  timestamp: number,
): Promise<void> => {
  const expired = await retryD1Read(() =>
    env.DB.prepare(
      "SELECT id FROM secrets WHERE status = 'pending' AND created_at <= ? LIMIT 100",
    )
      .bind(timestamp - PENDING_TTL_MS)
      .all<{ id: string }>(),
  )

  for (const secret of expired.results) {
    await deleteSecretAndFileRecord(env, secret.id)
  }
}

export const d1 = {
  insertReadIds,
  remainingReads,
  deleteSecretRecord,
  destroySecretContent,
  findSecretByReadId,
  findSecretByTrackId,
  findReadRowsBySecretId,
  consumeReadId,
  destroyReadyExpiredRecords,
  deleteTrackingExpiredRecords,
  deletePendingRecords,
}
