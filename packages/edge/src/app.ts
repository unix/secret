import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { rateLimit } from '@/middleware/rate-limit'
import { evmAddressStatusRoute } from '@/routes/chains/addresses'
import { resolveEnsName } from '@/routes/chains/ens'
import { evmChallenge, evmVerify } from '@/routes/chains/evm'
import { completeFileSecret, initFileSecret } from '@/routes/secrets/files'
import { downloadFileSecret, readSecret } from '@/routes/secrets/read'
import { storeTextSecret } from '@/routes/secrets/text'
import { trackSecret } from '@/routes/secrets/track'
import { isTransientD1Error } from '@/storage/d1-retry'
import { status } from '@/routes/status'
import type { AppEnv } from '@/types'

export const app = new Hono<AppEnv>()

const safeRequestPath = (url: string): string => {
  const pathname = new URL(url).pathname
  if (pathname === '/api/secrets/text') return pathname
  if (pathname === '/api/secrets/files/init') return pathname
  if (pathname.startsWith('/api/secrets/files/'))
    return '/api/secrets/files/[secretId]/complete'
  if (pathname.startsWith('/api/chains/evm/addresses/'))
    return '/api/chains/evm/addresses/[address]/status'
  if (pathname.startsWith('/api/chains/evm/resolve-ens')) return pathname
  if (pathname.startsWith('/api/chains/evm/'))
    return '/api/chains/evm/[evmId]/[action]'
  if (pathname.startsWith('/api/secrets/track/'))
    return '/api/secrets/track/[trackId]'
  if (pathname.startsWith('/api/secrets/')) return '/api/secrets/[readId]'
  return pathname
}

const errorDetails = (error: unknown): Record<string, unknown> => {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
    }
  }

  return {
    message: String(error),
    name: typeof error,
  }
}

app.use('/api/*', cors())
app.use('/api/secrets/text', rateLimit('CREATE_SECRET_LIMITER', 'create-secret'))
app.use('/api/secrets/files/*', rateLimit('CREATE_SECRET_LIMITER', 'create-secret'))
app.use('/api/chains/evm/*', rateLimit('CHAIN_LIMITER', 'chain'))

app.get('/status', status)

app.post('/api/secrets/text', storeTextSecret)
app.post('/api/secrets/files/init', initFileSecret)
app.post('/api/secrets/files/:secretId/complete', completeFileSecret)
app.get('/api/chains/evm/addresses/:address/status', evmAddressStatusRoute)
app.post('/api/chains/evm/resolve-ens', resolveEnsName)
app.post('/api/chains/evm/:evmId/challenge', evmChallenge)
app.post('/api/chains/evm/:evmId/verify', evmVerify)
app.get('/api/secrets/track/:trackId', trackSecret)
app.get('/api/secrets/:readId/file', downloadFileSecret)
app.get('/api/secrets/:readId', readSecret)

app.onError((error, c) => {
  console.error('edge request failed', {
    error: errorDetails(error),
    method: c.req.method,
    path: safeRequestPath(c.req.url),
  })

  if (isTransientD1Error(error))
    return c.json({ error: 'Database connection temporarily unavailable.' }, 503)
  return c.json({ error: 'Internal server error.' }, 500)
})
