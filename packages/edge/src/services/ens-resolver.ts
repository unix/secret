import { normalize } from 'viem/ens'
import { checksumAddress, decodedAddress, encodedEnsNode } from './address'
import { ethCall, type EthRpcProvider } from './eth-rpc'
import {
  ENS_CREATE_CACHE_MAX_AGE_MS,
  ENS_FAILURE_CACHE_TTL_MS,
  ENS_SUCCESS_CACHE_TTL_MS,
} from '@/utils/config'

type EnsResolutionStatus = 'resolved' | 'unresolved' | 'invalid' | 'error'

type EnsResolutionRow = {
  readonly address: string | null
  readonly error: string | null
  readonly name: string
  readonly resolved_at: number
  readonly status: EnsResolutionStatus
  readonly updated_at: number
}

type EnsResolutionResult = {
  readonly address: `0x${string}` | null
  readonly cacheHit: boolean
  readonly error: string | null
  readonly name: string
  readonly resolvedAt: number
  readonly status: EnsResolutionStatus
}

export type EnsAccessPolicy = {
  readonly address: `0x${string}`
  readonly ens: string
}

type BackgroundTask = (task: Promise<void>) => void

const ENS_REGISTRY_ADDRESS = '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e'
const ENS_REGISTRY_RESOLVER_SELECTOR = '0x0178b8bf'
const ENS_RESOLVER_ADDR_SELECTOR = '0x3b3b57de'
const ENS_UNRESOLVED_MESSAGE = 'ENS name does not resolve to an Ethereum address.'

const FIND_ENS_RESOLUTION_QUERY = [
  'SELECT name, status, address, error, resolved_at, updated_at',
  'FROM ens_resolutions',
  'WHERE name = ?',
].join(' ')

const UPSERT_ENS_RESOLUTION_QUERY = [
  'INSERT INTO ens_resolutions',
  '(name, status, address, error, resolved_at, updated_at)',
  'VALUES (?, ?, ?, ?, ?, ?)',
  'ON CONFLICT(name) DO UPDATE SET',
  'status = excluded.status,',
  'address = excluded.address,',
  'error = excluded.error,',
  'resolved_at = excluded.resolved_at,',
  'updated_at = excluded.updated_at',
].join(' ')

const isCachedResultFresh = (row: EnsResolutionRow, timestamp: number): boolean => {
  const ttl =
    row.status === 'resolved' ? ENS_SUCCESS_CACHE_TTL_MS : ENS_FAILURE_CACHE_TTL_MS

  return timestamp - row.resolved_at <= ttl
}

const isAccessCacheFresh = (row: EnsResolutionRow, timestamp: number): boolean => {
  return timestamp - row.resolved_at <= ENS_CREATE_CACHE_MAX_AGE_MS
}

const resultFromRow = (
  row: EnsResolutionRow,
  cacheHit: boolean,
): EnsResolutionResult => {
  return {
    address: row.address ? checksumAddress(row.address) : null,
    cacheHit,
    error: row.error,
    name: row.name,
    resolvedAt: row.resolved_at,
    status: row.status,
  }
}

const normalizedEnsName = (value: string): string | null => {
  const trimmed = value.trim()
  if (!trimmed.includes('.')) return null

  try {
    return normalize(trimmed)
  } catch {
    return null
  }
}

const resolveAddress = async ({
  name,
  provider,
}: {
  readonly name: string
  readonly provider: EthRpcProvider
}): Promise<`0x${string}` | null> => {
  const node = encodedEnsNode(name)
  const resolverResult = await ethCall({
    data: `${ENS_REGISTRY_RESOLVER_SELECTOR}${node}`,
    provider,
    to: ENS_REGISTRY_ADDRESS,
  })
  const resolver = decodedAddress(resolverResult)
  if (!resolver) return null

  const addressResult = await ethCall({
    data: `${ENS_RESOLVER_ADDR_SELECTOR}${node}`,
    provider,
    to: resolver,
  })

  return decodedAddress(addressResult)
}

const resolveAddressOrThrow = async ({
  name,
  provider,
}: {
  readonly name: string
  readonly provider: EthRpcProvider
}): Promise<`0x${string}`> => {
  const address = await resolveAddress({
    name,
    provider,
  })
  if (!address) {
    throw new Error(ENS_UNRESOLVED_MESSAGE)
  }

  return address
}

const findResolution = async (
  db: D1Database,
  name: string,
): Promise<EnsResolutionRow | null> => {
  return await db
    .prepare(FIND_ENS_RESOLUTION_QUERY)
    .bind(name)
    .first<EnsResolutionRow>()
}

const upsertResolution = async ({
  address,
  db,
  error,
  name,
  status,
  timestamp,
}: {
  readonly address: `0x${string}` | null
  readonly db: D1Database
  readonly error: string | null
  readonly name: string
  readonly status: EnsResolutionStatus
  readonly timestamp: number
}): Promise<EnsResolutionResult> => {
  await db
    .prepare(UPSERT_ENS_RESOLUTION_QUERY)
    .bind(name, status, address, error, timestamp, timestamp)
    .run()

  return {
    address,
    cacheHit: false,
    error,
    name,
    resolvedAt: timestamp,
    status,
  }
}

const resolveAndPersistInBackground = async ({
  db,
  name,
  provider,
  timestamp,
  waitUntil,
}: {
  readonly db: D1Database
  readonly name: string
  readonly provider: EthRpcProvider
  readonly timestamp: number
  readonly waitUntil: BackgroundTask
}): Promise<`0x${string}`> => {
  const address = await resolveAddressOrThrow({
    name,
    provider,
  })

  waitUntil(
    upsertResolution({
      address,
      db,
      error: null,
      name,
      status: 'resolved',
      timestamp,
    }).then(() => undefined),
  )

  return address
}

const refreshEns = async ({
  db,
  name,
  provider,
  timestamp,
}: {
  readonly db: D1Database
  readonly name: string
  readonly provider: EthRpcProvider
  readonly timestamp: number
}): Promise<EnsResolutionResult> => {
  try {
    const address = await resolveAddressOrThrow({
      name,
      provider,
    })

    return await upsertResolution({
      address,
      db,
      error: null,
      name,
      status: 'resolved',
      timestamp,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to resolve ENS name.'

    return await upsertResolution({
      address: null,
      db,
      error: message,
      name,
      status: message === ENS_UNRESOLVED_MESSAGE ? 'unresolved' : 'error',
      timestamp,
    })
  }
}

const resolveForPreview = async ({
  db,
  name,
  provider,
  timestamp,
}: {
  readonly db: D1Database
  readonly name: string
  readonly provider: EthRpcProvider
  readonly timestamp: number
}): Promise<EnsResolutionResult> => {
  const normalized = normalizedEnsName(name)
  if (!normalized) {
    const fallbackName = name.trim()

    return await upsertResolution({
      address: null,
      db,
      error: 'Enter a valid ENS name.',
      name: fallbackName,
      status: 'invalid',
      timestamp,
    })
  }

  const cached = await findResolution(db, normalized)
  if (cached && isCachedResultFresh(cached, timestamp)) {
    return resultFromRow(cached, true)
  }

  return await refreshEns({
    db,
    name: normalized,
    provider,
    timestamp,
  })
}

const refreshPreviewCache = async ({
  db,
  name,
  provider,
}: {
  readonly db: D1Database
  readonly name: string
  readonly provider: EthRpcProvider
}): Promise<void> => {
  const normalized = normalizedEnsName(name)
  if (!normalized) return

  await refreshEns({
    db,
    name: normalized,
    provider,
    timestamp: Date.now(),
  })
}

const accessPolicy = async ({
  db,
  name,
  provider,
  timestamp,
  waitUntil,
}: {
  readonly db: D1Database
  readonly name: string
  readonly provider: EthRpcProvider
  readonly timestamp: number
  readonly waitUntil: BackgroundTask
}): Promise<EnsAccessPolicy | 'conflict' | 'invalid'> => {
  const normalized = normalizedEnsName(name)
  if (!normalized) return 'invalid'

  const cached = await findResolution(db, normalized)
  if (
    cached &&
    cached.status === 'resolved' &&
    cached.address &&
    isAccessCacheFresh(cached, timestamp)
  ) {
    return {
      address: checksumAddress(cached.address),
      ens: normalized,
    }
  }
  if (cached && isAccessCacheFresh(cached, timestamp)) {
    return 'conflict'
  }

  try {
    const address = await resolveAndPersistInBackground({
      db,
      name: normalized,
      provider,
      timestamp,
      waitUntil,
    })

    return {
      address,
      ens: normalized,
    }
  } catch {
    return 'conflict'
  }
}

export const resolveEns = {
  accessPolicy,
  refreshPreviewCache,
  resolveForPreview,
}
