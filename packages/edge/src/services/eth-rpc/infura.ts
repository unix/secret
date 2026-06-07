import type { EthRpcProvider } from './types'

export const infuraProvider = (apiKey: string): EthRpcProvider => {
  return {
    name: 'infura',
    url: `https://mainnet.infura.io/v3/${encodeURIComponent(apiKey)}`,
  }
}
