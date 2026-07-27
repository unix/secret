import { getAddress, namehash } from 'viem'

const HEX_WORD_PATTERN = /^0x[0-9a-fA-F]{64}$/
const ZERO_HEX_WORD_PATTERN = /^0x0{64}$/

export const checksumAddress = (address: string): `0x${string}` => {
  return getAddress(address)
}

export const encodedEnsNode = (name: string): string => {
  return namehash(name).slice(2)
}

export const decodedAddress = (result: string): `0x${string}` | null => {
  if (!HEX_WORD_PATTERN.test(result)) {
    throw new Error('Ethereum RPC returned an invalid address result.')
  }
  if (ZERO_HEX_WORD_PATTERN.test(result)) return null
  return checksumAddress(`0x${result.slice(-40)}`)
}
