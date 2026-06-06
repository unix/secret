import { readFile } from 'node:fs/promises'
import type { SelfHostConfig } from '../../types'
import { SelfHostError } from '../../utils/errors'
import { paths } from '../../utils/paths'
import type { PreflightCheck, PreflightContext } from './types'

export const configPreflight: PreflightCheck = {
  label: 'secret.config.json',
  run: async context => {
    context.config = await readConfig()
  },
}

export const requireConfig = (context: PreflightContext): SelfHostConfig => {
  if (context.config) return context.config

  throw new SelfHostError(
    'Preflight order error: secret.config.json is not loaded yet.',
  )
}

const readConfig = async (): Promise<SelfHostConfig> => {
  let parsed: unknown
  try {
    parsed = JSON.parse(await readFile(paths.secretConfig, 'utf8'))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    throw new SelfHostError(`secret.config.json is not valid JSON: ${message}`)
  }

  if (!isSelfHostConfig(parsed)) {
    throw new SelfHostError(
      'secret.config.json must include schemaVersion, portal, edge, and limits.',
    )
  }

  return parsed
}

const isSelfHostConfig = (value: unknown): value is SelfHostConfig => {
  if (!isRecord(value)) return false

  return (
    typeof value.schemaVersion === 'number' &&
    isPortalConfigSection(value.portal) &&
    isConfigSection(value.edge) &&
    isRecord(value.limits)
  )
}

const isPortalConfigSection = (
  value: unknown,
): value is SelfHostConfig['portal'] => {
  if (!isConfigSection(value)) return false
  if (!('ga4' in value)) return true
  if (typeof value.ga4 !== 'string') return false

  return value.ga4 === '' || /^G-[A-Z0-9]+$/.test(value.ga4)
}

const isConfigSection = (value: unknown): value is SelfHostConfig['portal'] => {
  if (!isRecord(value)) return false

  return typeof value.origin === 'string' && typeof value.workerName === 'string'
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return value !== null && typeof value === 'object'
}
