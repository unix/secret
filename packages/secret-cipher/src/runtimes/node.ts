import { createWebStandardsRuntime } from './standards'
import { RUNTIME_NAMES } from './types'
import type { CipherRuntime } from './types'

export const createNodeRuntime = async (): Promise<CipherRuntime | null> => {
  const globalRuntime = createWebStandardsRuntime(
    Reflect.get(globalThis, 'crypto'),
    RUNTIME_NAMES.NODE,
  )
  if (globalRuntime) return globalRuntime

  try {
    const nodeCrypto = await import('node:crypto')
    return createWebStandardsRuntime(nodeCrypto.webcrypto, RUNTIME_NAMES.NODE)
  } catch {
    return null
  }
}
