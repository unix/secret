import { getAddress, isAddressEqual } from 'viem'
import { retryD1Read } from '@/storage/d1-retry'
import { EVM_ID_BYTES } from '@/utils/config'
import { randomId } from '@/utils/ids'

export type EvmAccessPolicy = {
  readonly address: `0x${string}`
  readonly chainId: number
  readonly input: string
}

export type EvmReadRow = {
  readonly address: string
  readonly chain_id: number
  readonly consumed_at: number | null
  readonly evm_id: string
  readonly expires_at: number
  readonly read_id: string
}

export type EvmChallengeRow = {
  readonly consumed_at: number | null
  readonly domain: string
  readonly evm_id: string
  readonly expires_at: number
  readonly id: string
  readonly nonce: string
  readonly uri: string
}

const INSERT_EVM_POLICY_QUERY = [
  'INSERT INTO secret_evm_policies',
  '(secret_id, chain_id, address, input, created_at)',
  'VALUES (?, ?, ?, ?, ?)',
].join(' ')

const FIND_EVM_POLICY_QUERY = [
  'SELECT chain_id, address, input',
  'FROM secret_evm_policies',
  'WHERE secret_id = ?',
].join(' ')

const INSERT_EVM_READ_QUERY = [
  'INSERT INTO secret_evm_reads',
  '(evm_id, read_id, secret_id, chain_id, address, expires_at, created_at)',
  'VALUES (?, ?, ?, ?, ?, ?, ?)',
].join(' ')

const FIND_EVM_READ_QUERY = [
  'SELECT',
  'secret_evm_reads.evm_id, secret_evm_reads.read_id, secret_evm_reads.chain_id,',
  'secret_evm_reads.address, secret_evm_reads.expires_at, secret_reads.consumed_at',
  'FROM secret_evm_reads',
  'JOIN secret_reads ON secret_reads.read_id = secret_evm_reads.read_id',
  'WHERE secret_evm_reads.evm_id = ?',
].join(' ')

const INSERT_EVM_CHALLENGE_QUERY = [
  'INSERT INTO secret_evm_challenges',
  '(id, evm_id, nonce, domain, uri, issued_at, expires_at)',
  'VALUES (?, ?, ?, ?, ?, ?, ?)',
].join(' ')

const FIND_EVM_CHALLENGE_QUERY = [
  'SELECT id, evm_id, nonce, domain, uri, expires_at, consumed_at',
  'FROM secret_evm_challenges',
  'WHERE id = ? AND evm_id = ?',
].join(' ')

const CONSUME_EVM_CHALLENGE_QUERY = [
  'UPDATE secret_evm_challenges',
  'SET consumed_at = ?',
  'WHERE id = ? AND evm_id = ? AND consumed_at IS NULL AND expires_at > ?',
].join(' ')

const normalizePolicy = (policy: EvmAccessPolicy): EvmAccessPolicy => {
  return {
    ...policy,
    address: getAddress(policy.address),
  }
}

const samePolicyAddress = (
  left: EvmAccessPolicy,
  right: EvmAccessPolicy,
): boolean => {
  return (
    left.chainId === right.chainId && isAddressEqual(left.address, right.address)
  )
}

const insertPolicy = async ({
  createdAt,
  db,
  policy,
  secretId,
}: {
  readonly createdAt: number
  readonly db: D1Database
  readonly policy: EvmAccessPolicy
  readonly secretId: string
}): Promise<void> => {
  const normalized = normalizePolicy(policy)
  await db
    .prepare(INSERT_EVM_POLICY_QUERY)
    .bind(
      secretId,
      normalized.chainId,
      normalized.address,
      normalized.input,
      createdAt,
    )
    .run()
}

const findPolicy = async (
  db: D1Database,
  secretId: string,
): Promise<EvmAccessPolicy | null> => {
  const row = await db.prepare(FIND_EVM_POLICY_QUERY).bind(secretId).first<{
    chain_id: number
    address: string
    input: string
  }>()
  if (!row) return null

  return {
    address: getAddress(row.address),
    chainId: row.chain_id,
    input: row.input,
  }
}

const insertReadIds = async ({
  createdAt,
  db,
  expiresAt,
  policy,
  readIds,
  secretId,
}: {
  readonly createdAt: number
  readonly db: D1Database
  readonly expiresAt: number
  readonly policy: EvmAccessPolicy
  readonly readIds: readonly string[]
  readonly secretId: string
}): Promise<readonly string[]> => {
  const normalized = normalizePolicy(policy)
  const evmIds = readIds.map(() => randomId(EVM_ID_BYTES))
  await db.batch(
    evmIds.map((evmId, index) =>
      db
        .prepare(INSERT_EVM_READ_QUERY)
        .bind(
          evmId,
          readIds[index],
          secretId,
          normalized.chainId,
          normalized.address,
          expiresAt,
          createdAt,
        ),
    ),
  )

  return evmIds
}

const findRead = async (
  db: D1Database,
  evmId: string,
): Promise<EvmReadRow | null> => {
  return await retryD1Read(() =>
    db.prepare(FIND_EVM_READ_QUERY).bind(evmId).first<EvmReadRow>(),
  )
}

const insertChallenge = async ({
  db,
  domain,
  evmId,
  expiresAt,
  id,
  issuedAt,
  nonce,
  uri,
}: {
  readonly db: D1Database
  readonly domain: string
  readonly evmId: string
  readonly expiresAt: number
  readonly id: string
  readonly issuedAt: number
  readonly nonce: string
  readonly uri: string
}): Promise<void> => {
  await db
    .prepare(INSERT_EVM_CHALLENGE_QUERY)
    .bind(id, evmId, nonce, domain, uri, issuedAt, expiresAt)
    .run()
}

const findChallenge = async ({
  challengeId,
  db,
  evmId,
}: {
  readonly challengeId: string
  readonly db: D1Database
  readonly evmId: string
}): Promise<EvmChallengeRow | null> => {
  return await retryD1Read(() =>
    db
      .prepare(FIND_EVM_CHALLENGE_QUERY)
      .bind(challengeId, evmId)
      .first<EvmChallengeRow>(),
  )
}

const consumeChallenge = async ({
  challengeId,
  db,
  evmId,
  timestamp,
}: {
  readonly challengeId: string
  readonly db: D1Database
  readonly evmId: string
  readonly timestamp: number
}): Promise<boolean> => {
  const result = await db
    .prepare(CONSUME_EVM_CHALLENGE_QUERY)
    .bind(timestamp, challengeId, evmId, timestamp)
    .run()

  return result.success && (result.meta.changes ?? 0) > 0
}

export const d1Evm = {
  consumeChallenge,
  findChallenge,
  findPolicy,
  findRead,
  insertChallenge,
  insertPolicy,
  insertReadIds,
  samePolicyAddress,
}
