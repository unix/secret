import { app } from './app'
import { cleanupExpiredSecrets } from './scheduled'
import type { Bindings } from '@/types'

export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledEvent, env: Bindings): Promise<void> {
    await cleanupExpiredSecrets(env)
  },
}
