import type { MiddlewareHandler } from 'hono'
import type { AppEnv, RateLimitBindingName } from '@/types'

const RATE_LIMIT_MESSAGE =
  'Requests are coming in too quickly. Please wait a minute and try again.'
const RETRY_AFTER_SECONDS = '60'

const clientKey = (headers: Headers): string => {
  const cfConnectingIp = headers.get('cf-connecting-ip')?.trim()
  if (cfConnectingIp) return cfConnectingIp

  const forwardedFor = headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  if (forwardedFor) return forwardedFor

  return 'unknown'
}

export const rateLimit = (
  binding: RateLimitBindingName,
  scope: string,
): MiddlewareHandler<AppEnv> => {
  return async (c, next) => {
    if (c.req.method === 'OPTIONS') {
      await next()
      return
    }

    const { success } = await c.env[binding].limit({
      key: `${scope}:${clientKey(c.req.raw.headers)}`,
    })
    if (success) {
      await next()
      return
    }

    c.header('Retry-After', RETRY_AFTER_SECONDS)
    return c.json({ error: RATE_LIMIT_MESSAGE }, 429)
  }
}
