import type { AppContext } from '@/types'

export const status = (c: AppContext): Response => {
  return c.json({
    ok: true,
  })
}
