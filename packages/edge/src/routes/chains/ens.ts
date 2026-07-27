import { resolveEns } from '@/services/ens-resolver'
import { ethRpcProvider } from '@/services/eth-rpc'
import type { AppContext } from '@/types'
import { http } from '@/utils/http'

type ResolveEnsInput = {
  readonly name: string
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return value !== null && typeof value === 'object'
}

const isResolveEnsInput = (value: unknown): value is ResolveEnsInput => {
  if (!isRecord(value)) return false
  return typeof value.name === 'string'
}

export const resolveEnsName = async (c: AppContext): Promise<Response> => {
  const provider = ethRpcProvider(c.env)
  if (!provider)
    return http.notImplemented(c, 'Ethereum RPC provider is not configured.')
  const input = await c.req.json<unknown>()
  if (!isResolveEnsInput(input))
    return http.badRequest(c, 'Invalid ENS resolution input.')

  const result = await resolveEns.resolveForPreview({
    db: c.env.DB,
    name: input.name,
    provider,
    timestamp: Date.now(),
  })
  if (result.cacheHit) {
    c.executionCtx.waitUntil(
      resolveEns.refreshPreviewCache({
        db: c.env.DB,
        name: result.name,
        provider,
      }),
    )
  }

  return c.json(result)
}
