import { d1 } from '@/storage'
import type { AppContext } from '@/types'
import { http } from '@/utils/http'

type TrackStatus = 'pending' | 'ready' | 'destroyed' | 'expired'

const trackStatus = ({
  expiresAt,
  remainingReads,
  status,
  timestamp,
}: {
  readonly expiresAt: number
  readonly remainingReads: number
  readonly status: 'pending' | 'ready' | 'destroyed'
  readonly timestamp: number
}): TrackStatus => {
  const hasExpiredWithRemainingReads = expiresAt <= timestamp && remainingReads > 0
  if (hasExpiredWithRemainingReads) return 'expired'

  return status
}

export const trackSecret = async (c: AppContext): Promise<Response> => {
  const trackId = c.req.param('trackId')
  if (!trackId) {
    return http.notFound(c, 'Secret not found.')
  }

  const secret = await d1.findSecretByTrackId(c.env.DB, trackId)
  if (!secret) {
    return http.notFound(c, 'Secret not found.')
  }

  const reads = await d1.findReadRowsBySecretId(c.env.DB, secret.id)
  const remainingReads = reads.filter(read => read.consumed_at === null).length
  const timestamp = Date.now()

  return c.json({
    kind: secret.kind,
    status: trackStatus({
      expiresAt: secret.expires_at,
      remainingReads,
      status: secret.status,
      timestamp,
    }),
    createdAt: secret.created_at,
    completedAt: secret.completed_at,
    expiresAt: secret.expires_at,
    destroyedAt: secret.destroyed_at,
    readLimit: secret.read_limit,
    remainingReads,
    reads: reads.map(read => ({
      readId: read.read_id,
      consumedAt: read.consumed_at,
    })),
  })
}
