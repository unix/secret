import { evmAddressStatus } from '@/services/evm-account'
import { ethRpcProvider } from '@/services/eth-rpc'
import type { AppContext } from '@/types'
import { http } from '@/utils/http'

const SUCCESS_CACHE_CONTROL = 'public, max-age=1800'
const RPC_UNAVAILABLE_MESSAGE = 'Ethereum RPC is unavailable.'

export const evmAddressStatusRoute = async (c: AppContext): Promise<Response> => {
  const provider = ethRpcProvider(c.env)
  if (!provider)
    return http.notImplemented(c, 'Ethereum RPC provider is not configured.')
  const address = c.req.param('address')
  if (!address) return c.body(null, 400)

  const status = await evmAddressStatus({
    address,
    provider,
  })
  if (status === 'unavailable') return http.badGateway(c, RPC_UNAVAILABLE_MESSAGE)
  if (status !== 'personal') return c.body(null, 400)
  c.header('Cache-Control', SUCCESS_CACHE_CONTROL)
  return http.noContent(c)
}
