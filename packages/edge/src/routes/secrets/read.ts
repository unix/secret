import { d1 } from '@/storage'
import type { AppContext } from '@/types'
import { http } from '@/utils/http'

export const readSecret = async (c: AppContext): Promise<Response> => {
  const readId = c.req.param('readId')
  if (!readId) {
    return http.notFound(c, 'Secret not found.')
  }

  const row = await d1.findSecretByReadId(c.env.DB, readId)
  if (!row) {
    return http.notFound(c, 'Secret not found.')
  }

  if (row.consumed_at) {
    return http.gone(c, 'Secret link has already been used.')
  }

  const timestamp = Date.now()
  if (row.status === 'destroyed' && row.expires_at <= timestamp) {
    return http.gone(c, 'Secret has expired.')
  }

  if (row.status !== 'ready') {
    return http.notFound(c, 'Secret not found.')
  }

  if (row.expires_at <= timestamp) {
    await d1.destroySecretContent({
      deleteFileObject: true,
      env: c.env,
      secretId: row.id,
      timestamp,
    })
    return http.gone(c, 'Secret has expired.')
  }

  if (row.kind === 'text') {
    const cipher = row.text_cipher
    if (!cipher) {
      return http.serverError(c, 'Text secret is incomplete.')
    }

    const consumed = await d1.consumeReadId(c.env.DB, readId, timestamp)
    const didConsumeReadId = consumed.success && (consumed.meta.changes ?? 0) > 0
    if (!didConsumeReadId) {
      return http.conflict(c, 'Secret link could not be consumed.')
    }

    const remaining = await d1.remainingReads(c.env.DB, row.id)
    const shouldDeleteRecord = remaining === 0
    if (shouldDeleteRecord) {
      await d1.destroySecretContent({
        deleteFileObject: false,
        env: c.env,
        secretId: row.id,
        timestamp,
      })
    }

    return c.json({
      kind: 'text',
      cipher,
      expiresAt: row.expires_at,
    })
  }

  if (
    !row.r2_key ||
    !row.salt ||
    !row.manifest_iv ||
    !row.encrypted_manifest ||
    !row.chunk_size ||
    !row.chunk_count ||
    row.encrypted_size <= 0
  ) {
    return http.serverError(c, 'File secret is incomplete.')
  }

  return c.json({
    kind: 'file',
    manifest: {
      salt: row.salt,
      iv: row.manifest_iv,
      cipher: row.encrypted_manifest,
      chunkSize: row.chunk_size,
      chunkCount: row.chunk_count,
      encryptedSize: row.encrypted_size,
    },
    expiresAt: row.expires_at,
  })
}

export const downloadFileSecret = async (c: AppContext): Promise<Response> => {
  const readId = c.req.param('readId')
  if (!readId) {
    return http.notFound(c, 'Secret not found.')
  }

  const row = await d1.findSecretByReadId(c.env.DB, readId)
  if (!row) {
    return http.notFound(c, 'Secret not found.')
  }

  if (row.consumed_at) {
    return http.gone(c, 'Secret link has already been used.')
  }

  const timestamp = Date.now()
  if (row.status === 'destroyed' && row.expires_at <= timestamp) {
    return http.gone(c, 'Secret has expired.')
  }

  if (row.status !== 'ready') {
    return http.notFound(c, 'Secret not found.')
  }

  if (row.expires_at <= timestamp) {
    await d1.destroySecretContent({
      deleteFileObject: true,
      env: c.env,
      secretId: row.id,
      timestamp,
    })
    return http.gone(c, 'Secret has expired.')
  }

  if (row.kind !== 'file' || !row.r2_key) {
    return http.notFound(c, 'Secret not found.')
  }

  const consumed = await d1.consumeReadId(c.env.DB, readId, timestamp)
  const didConsumeReadId = consumed.success && (consumed.meta.changes ?? 0) > 0
  if (!didConsumeReadId) {
    return http.conflict(c, 'Secret link could not be consumed.')
  }

  const object = await c.env.FILES.get(row.r2_key)
  if (!object) {
    return http.serverError(c, 'File secret is incomplete.')
  }

  const remaining = await d1.remainingReads(c.env.DB, row.id)
  const shouldDeleteRecord = remaining === 0
  if (shouldDeleteRecord) {
    await d1.destroySecretContent({
      deleteFileObject: false,
      env: c.env,
      secretId: row.id,
      timestamp,
    })
  }

  return new Response(object.body, {
    headers: {
      'Content-Length': String(object.size),
      'Content-Type': 'application/octet-stream',
    },
  })
}
