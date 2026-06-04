import { createWebStandardsRuntime } from './standards'
import { createWebRuntime } from './web'
import { ERRORS, RUNTIME_PREFERENCE } from '../utils/constants'
import { CipherError } from '../utils/errors'
import type {
  CipherRuntime,
  CipherRuntimeOptions,
  RuntimePreference,
} from '../types'

const isNodeEnvironment = (): boolean => {
  const processValue = Reflect.get(globalThis, 'process')
  if (typeof processValue !== 'object' || processValue === null) return false

  const versions = Reflect.get(processValue, 'versions')
  if (typeof versions !== 'object' || versions === null) return false

  return typeof Reflect.get(versions, 'node') === 'string'
}

const isBrowserEnvironment = (): boolean => {
  return Reflect.has(globalThis, 'window')
}

const loadNodeRuntime = async (): Promise<CipherRuntime | null> => {
  const { createNodeRuntime } = await import('./node')
  return createNodeRuntime()
}

const resolvePreferredRuntime = async (
  preference: RuntimePreference,
): Promise<CipherRuntime | null> => {
  if (preference === RUNTIME_PREFERENCE.WEB) {
    return createWebRuntime()
  }

  if (preference === RUNTIME_PREFERENCE.WEB_STANDARDS) {
    return createWebStandardsRuntime()
  }

  if (preference === RUNTIME_PREFERENCE.NODE) {
    return loadNodeRuntime()
  }

  return null
}

const resolveAutoRuntime = async (): Promise<CipherRuntime | null> => {
  if (isBrowserEnvironment()) {
    const webRuntime = createWebRuntime()
    if (webRuntime) return webRuntime
  }

  if (isNodeEnvironment()) {
    const nodeRuntime = await loadNodeRuntime()
    if (nodeRuntime) return nodeRuntime
  }

  const standardsRuntime = createWebStandardsRuntime()
  if (standardsRuntime) return standardsRuntime

  return null
}

export const resolveCipherRuntime = async ({
  runtime,
  preferredRuntime = RUNTIME_PREFERENCE.AUTO,
}: CipherRuntimeOptions = {}): Promise<CipherRuntime> => {
  if (runtime) return runtime

  const resolved =
    preferredRuntime === RUNTIME_PREFERENCE.AUTO
      ? await resolveAutoRuntime()
      : await resolvePreferredRuntime(preferredRuntime)

  if (resolved) return resolved

  throw new CipherError(
    ERRORS.ENVIRONMENT_UNAVAILABLE,
    `No ${preferredRuntime} cipher runtime is available in this environment.`,
  )
}
