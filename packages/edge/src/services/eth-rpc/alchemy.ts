import type { EthRpcProvider } from './types'

export const alchemyProvider = (apiKey: string): EthRpcProvider => {
  return {
    name: 'alchemy',
    url: `https://eth-mainnet.g.alchemy.com/v2/${encodeURIComponent(apiKey)}`,
  }
}
