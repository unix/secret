import { alchemyProvider } from './alchemy'
import { infuraProvider } from './infura'
import { ethRpcRequest } from './json-rpc'
import type { EthRpcProvider } from './types'
import type { Bindings } from '@/types'

export type { EthRpcProvider } from './types'

export const ethRpcProvider = (
  env: Pick<Bindings, 'ETH_ALCHEMY_API_KEY' | 'ETH_INFURA_API_KEY'>,
): EthRpcProvider | null => {
  const alchemyKey = env.ETH_ALCHEMY_API_KEY?.trim()
  if (alchemyKey) return alchemyProvider(alchemyKey)
  const infuraKey = env.ETH_INFURA_API_KEY?.trim()
  if (infuraKey) return infuraProvider(infuraKey)
  return null
}

export const ethCall = async ({
  data,
  provider,
  to,
}: {
  readonly data: string
  readonly provider: EthRpcProvider
  readonly to: string
}): Promise<string> => {
  return await ethRpcRequest({
    method: 'eth_call',
    params: [{ data, to }, 'latest'],
    provider,
  })
}

export const ethGetCode = async ({
  address,
  provider,
}: {
  readonly address: string
  readonly provider: EthRpcProvider
}): Promise<string> => {
  return await ethRpcRequest({
    method: 'eth_getCode',
    params: [address, 'latest'],
    provider,
  })
}
