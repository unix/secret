import { createWebStandardsRuntime } from './standards'
import { RUNTIME_NAMES } from './types'

import type { CipherRuntime } from './types'

export const createWebRuntime = (): CipherRuntime | null => {
  const windowValue = Reflect.get(globalThis, 'window')
  if (typeof windowValue !== 'object' || windowValue === null) return null

  return createWebStandardsRuntime(
    Reflect.get(windowValue, 'crypto'),
    RUNTIME_NAMES.WEB,
  )
}
