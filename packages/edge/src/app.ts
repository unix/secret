import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { completeFileSecret, initFileSecret } from '@/routes/secrets/files'
import { downloadFileSecret, readSecret } from '@/routes/secrets/read'
import { storeTextSecret } from '@/routes/secrets/text'
import { trackSecret } from '@/routes/secrets/track'
import { isTransientD1Error } from '@/storage/d1-secrets'
import { status } from '@/routes/status'
import type { AppEnv } from '@/types'

export const app = new Hono<AppEnv>()

app.use('/api/*', cors())

app.get('/status', status)

app.post('/api/secrets/text', storeTextSecret)
app.post('/api/secrets/files/init', initFileSecret)
app.post('/api/secrets/files/:secretId/complete', completeFileSecret)
app.get('/api/secrets/track/:trackId', trackSecret)
app.get('/api/secrets/:readId/file', downloadFileSecret)
app.get('/api/secrets/:readId', readSecret)

app.onError((error, c) => {
  if (isTransientD1Error(error)) {
    return c.json({ error: 'Database connection temporarily unavailable.' }, 503)
  }

  return c.json({ error: 'Internal server error.' }, 500)
})
