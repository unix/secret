import { getAddress } from 'viem'
import { evmAddressStatus } from '@/services/evm-account'
import type { EthRpcProvider } from '@/services/eth-rpc'
import { resolveEns } from '@/services/ens-resolver'
import type { EvmAccessPolicy } from '@/storage/d1-evm'
import type { EvmAccessInput } from '@/types'
import { EVM_MAINNET_CHAIN_ID } from '@/utils/config'

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return value !== null && typeof value === 'object'
}

const isEvmAccessInput = (value: unknown): value is EvmAccessInput => {
  if (!isRecord(value)) return false

  return (
    value.type === 'evm' &&
    value.chainId === EVM_MAINNET_CHAIN_ID &&
    (typeof value.address === 'string' || typeof value.ens === 'string')
  )
}

export const evmAccessPolicy = async ({
  db,
  provider,
  timestamp,
  value,
  waitUntil,
}: {
  readonly db: D1Database
  readonly provider: EthRpcProvider | null
  readonly timestamp: number
  readonly value: unknown
  readonly waitUntil: (task: Promise<void>) => void
}): Promise<
  | EvmAccessPolicy
  | 'conflict'
  | 'invalid'
  | 'unsupported'
  | 'unsupported-account'
  | 'unavailable'
  | null
> => {
  if (value === undefined || value === null) return null
  if (!isEvmAccessInput(value)) return 'invalid'
  if (!provider) return 'unsupported'

  if (value.ens) {
    const policy = await resolveEns.accessPolicy({
      db,
      name: value.ens,
      provider,
      timestamp,
      waitUntil,
    })
    if (policy === 'conflict' || policy === 'invalid') return policy
    const status = await evmAddressStatus({
      address: policy.address,
      provider,
    })
    if (status === 'unavailable') return 'unavailable'
    if (status !== 'personal') return 'unsupported-account'

    return {
      address: policy.address,
      chainId: value.chainId,
      input: policy.ens,
    }
  }

  if (!value.address) return 'invalid'

  let address: `0x${string}`
  try {
    address = getAddress(value.address)
  } catch {
    return 'invalid'
  }

  const status = await evmAddressStatus({
    address,
    provider,
  })
  if (status === 'unavailable') return 'unavailable'
  if (status !== 'personal') return 'unsupported-account'

  return {
    address,
    chainId: value.chainId,
    input: value.address,
  }
}
