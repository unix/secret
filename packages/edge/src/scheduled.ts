import { d1 } from '@/storage'
import type { Bindings } from '@/types'

export const cleanupExpiredSecrets = async (env: Bindings): Promise<void> => {
  const timestamp = Date.now()
  await d1.destroyReadyExpiredRecords(env, timestamp)
  await d1.deleteTrackingExpiredRecords(env, timestamp)
  await d1.deletePendingRecords(env, timestamp)
}
