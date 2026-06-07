import type { EthRpcProvider } from './types'

type EthRpcResponse = {
  readonly error?: unknown
  readonly result?: unknown
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return value !== null && typeof value === 'object'
}

const isEthRpcResponse = (value: unknown): value is EthRpcResponse => {
  return isRecord(value)
}

const ethRpcErrorMessage = (error: unknown): string => {
  if (isRecord(error) && typeof error.message === 'string') return error.message

  return 'Ethereum RPC call failed.'
}

export const ethRpcRequest = async ({
  method,
  params,
  provider,
}: {
  readonly method: string
  readonly params: readonly unknown[]
  readonly provider: EthRpcProvider
}): Promise<string> => {
  const response = await fetch(provider.url, {
    body: JSON.stringify({
      id: 1,
      jsonrpc: '2.0',
      method,
      params,
    }),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })
  if (!response.ok) {
    throw new Error(`Ethereum RPC request failed with ${response.status}.`)
  }

  const payload: unknown = await response.json()
  if (!isEthRpcResponse(payload)) {
    throw new Error('Ethereum RPC returned an invalid response.')
  }
  if (payload.error) {
    throw new Error(ethRpcErrorMessage(payload.error))
  }
  if (typeof payload.result !== 'string') {
    throw new Error(`Ethereum RPC returned an invalid ${method} result.`)
  }

  return payload.result
}
