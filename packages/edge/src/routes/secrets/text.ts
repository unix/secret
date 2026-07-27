import { d1 } from '@/storage'
import { d1Evm } from '@/storage/d1-evm'
import type { AppContext, StoreTextInput } from '@/types'
import {
  MAX_TEXT_BYTES,
  MAX_TEXT_CIPHER_BYTES,
  SECRET_ID_BYTES,
  TRACK_ID_BYTES,
  TRACKING_TTL_MS,
} from '@/utils/config'
import { ethRpcProvider } from '@/services/eth-rpc'
import { textEncoder } from '@/utils/encoding'
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

const INSERT_TEXT_SECRET_QUERY = [
  'INSERT INTO secrets',
  '(id, kind, status, text_cipher, plain_size, encrypted_size, read_limit, track_id, expires_at, created_at, completed_at, tracking_expires_at)',
  "VALUES (?, 'text', 'ready', ?, ?, ?, ?, ?, ?, ?, ?, ?)",
].join(' ')

export const storeTextSecret = async (c: AppContext): Promise<Response> => {
  const input = await c.req.json<StoreTextInput>()
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
  const cipherBytes = textEncoder.encode(input.cipher).byteLength
  const isMissingCipher = !input.cipher
  const isPlainTextTooLarge = input.plainSize > MAX_TEXT_BYTES
  const isCipherTextTooLarge = cipherBytes > MAX_TEXT_CIPHER_BYTES
  const isInvalidTextSecret =
    isMissingCipher || isPlainTextTooLarge || isCipherTextTooLarge
  if (isInvalidTextSecret) {
    return http.badRequest(
      c,
      `Text secrets are limited to ${formatBytes(MAX_TEXT_BYTES)}.`,
    )
  }

  const expiresAt = timestamp + expiresInSeconds * 1000
  const secretId = randomId(SECRET_ID_BYTES)
  const trackId = randomId(TRACK_ID_BYTES)
  const readIds = createReadIds(reads)
  await c.env.DB.prepare(INSERT_TEXT_SECRET_QUERY)
    .bind(
      secretId,
      input.cipher,
      input.plainSize,
      cipherBytes,
      reads,
      trackId,
      expiresAt,
      timestamp,
      timestamp,
      expiresAt + TRACKING_TTL_MS,
    )
    .run()
  await d1.insertReadIds({
    db: c.env.DB,
    secretId,
    readIds,
    expiresAt,
  })
  if (accessPolicy) {
    await d1Evm.insertPolicy({
      db: c.env.DB,
      secretId,
      policy: accessPolicy,
      createdAt: timestamp,
    })
    const evmIds = await d1Evm.insertReadIds({
      db: c.env.DB,
      secretId,
      readIds,
      policy: accessPolicy,
      expiresAt,
      createdAt: timestamp,
    })

    return c.json({
      kind: 'text',
      evmIds,
      trackId,
      expiresAt,
    })
  }

  return c.json({
    kind: 'text',
    readIds,
    trackId,
    expiresAt,
  })
}
