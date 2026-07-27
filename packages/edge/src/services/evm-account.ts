import { getAddress } from 'viem'
import { ethGetCode, type EthRpcProvider } from './eth-rpc'

export type EvmAddressStatus = 'invalid' | 'personal' | 'unavailable' | 'unsupported'

const EMPTY_CODE = '0x'

export const evmAddressStatus = async ({
  address,
  provider,
}: {
  readonly address: string
  readonly provider: EthRpcProvider
}): Promise<EvmAddressStatus> => {
  let checksum: `0x${string}`
  try {
    checksum = getAddress(address)
  } catch {
    return 'invalid'
  }

  let code: string
  try {
    code = await ethGetCode({
      address: checksum,
      provider,
    })
  } catch {
    return 'unavailable'
  }
  if (code === EMPTY_CODE) return 'personal'
  return 'unsupported'
}
