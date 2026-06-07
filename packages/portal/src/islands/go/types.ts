export type SecretMode = 'text' | 'password' | 'file'

export type SecretSettings = {
  readonly expiresInSeconds: string
  readonly reads: string
}

export type EvmAccessRequirement = {
  readonly chainId: 1
  readonly type: 'evm'
} & (
  | {
      readonly address: `0x${string}`
      readonly ens?: never
      readonly resolvedAddress?: never
    }
  | {
      readonly address?: never
      readonly ens: string
      readonly resolvedAddress: `0x${string}`
    }
)
