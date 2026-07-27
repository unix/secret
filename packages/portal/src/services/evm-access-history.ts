import { indexedDBCache } from './storage/indexed-db-cache'

export type EvmAccessHistoryRecord = {
  readonly address: `0x${string}`
  readonly hit: number
  readonly kind: 'address' | 'ens'
  readonly key: string
  readonly normalizedValue: string
  readonly updatedAt: number
  readonly value: string
}

export type EvmAccessHistoryMatch = EvmAccessHistoryRecord & {
  readonly relatedEns: string | null
}

const DATABASE_NAME = 'secretPortal'
const MAX_ENTRIES = 200
const NAMESPACE = 'evmAccessHistory'

const cache = indexedDBCache.create<EvmAccessHistoryRecord>({
  databaseName: DATABASE_NAME,
  maxEntries: MAX_ENTRIES,
  namespace: NAMESPACE,
})

const normalizedValue = (value: string): string => {
  return value.trim().toLowerCase()
}

const keyFor = ({
  kind,
  value,
}: {
  readonly kind: EvmAccessHistoryRecord['kind']
  readonly value: string
}): string => {
  return `${kind}:${normalizedValue(value)}`
}

const shouldQuery = (value: string): boolean => {
  const normalized = normalizedValue(value)
  return normalized.length >= 1
}

const recordHit = (record: EvmAccessHistoryRecord): number => {
  if (!Number.isSafeInteger(record.hit) || record.hit < 1) return 1
  return record.hit
}

const nextHit = (record: EvmAccessHistoryRecord | null): number => {
  if (!record) return 1
  return recordHit(record) + 1
}

const recentEnsByAddress = (
  records: readonly EvmAccessHistoryRecord[],
): ReadonlyMap<string, string> => {
  const pairs = new Map<string, string>()
  for (const record of records) {
    if (record.kind !== 'ens') continue
    const normalizedAddress = normalizedValue(record.address)
    if (pairs.has(normalizedAddress)) continue
    pairs.set(normalizedAddress, record.value)
  }

  return pairs
}

const matches = async (value: string): Promise<readonly EvmAccessHistoryMatch[]> => {
  const normalized = normalizedValue(value)
  if (!shouldQuery(normalized)) return []
  const records = await cache.list()
  const ensByAddress = recentEnsByAddress(records)

  return records
    .filter(record => record.normalizedValue.startsWith(normalized))
    .sort((left, right) => {
      const leftHit = recordHit(left)
      const rightHit = recordHit(right)
      if (leftHit !== rightHit) return rightHit - leftHit
      return right.updatedAt - left.updatedAt
    })
    .slice(0, 5)
    .map(record => ({
      ...record,
      relatedEns: ensByAddress.get(normalizedValue(record.address)) ?? null,
    }))
}

const remove = async (record: EvmAccessHistoryRecord): Promise<void> => {
  await cache.remove(record.key)
}

const saveAddress = async (address: `0x${string}`): Promise<void> => {
  const key = keyFor({ kind: 'address', value: address })
  const existing = await cache.get(key)
  await cache.set(key, {
    address,
    hit: nextHit(existing),
    key,
    kind: 'address',
    normalizedValue: normalizedValue(address),
    updatedAt: Date.now(),
    value: address,
  })
}

const saveEns = async ({
  address,
  ens,
}: {
  readonly address: `0x${string}`
  readonly ens: string
}): Promise<void> => {
  const key = keyFor({ kind: 'ens', value: ens })
  const existing = await cache.get(key)
  await cache.set(key, {
    address,
    hit: nextHit(existing),
    key,
    kind: 'ens',
    normalizedValue: normalizedValue(ens),
    updatedAt: Date.now(),
    value: ens,
  })
}

export const evmAccessHistory = {
  matches,
  remove,
  saveAddress,
  saveEns,
}
