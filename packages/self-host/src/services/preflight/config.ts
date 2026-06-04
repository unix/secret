import { readFile } from 'node:fs/promises'

import type { SelfHostConfig } from '@/types'
import { SelfHostError } from '@/utils/errors'
import { paths } from '@/utils/paths'
import type { PreflightCheck, PreflightContext } from './types'

export const configPreflight: PreflightCheck = {
  label: 'secret.config.json',
  run: async context => {
    context.config = await readConfig()
  },
}

export const requireConfig = (context: PreflightContext): SelfHostConfig => {
  if (context.config) return context.config

  throw new SelfHostError('Preflight order error: secret.config.json is not loaded yet.')
}

async function readConfig(): Promise<SelfHostConfig> {
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
  if (!value || typeof value !== 'object') return false

  const record = value as Record<string, unknown>

  return (
    typeof record.schemaVersion === 'number' &&
    isConfigSection(record.portal) &&
    isConfigSection(record.edge) &&
    Boolean(record.limits) &&
    typeof record.limits === 'object'
  )
}

const isConfigSection = (value: unknown): value is SelfHostConfig['portal'] => {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    typeof (value as { origin?: unknown }).origin === 'string' &&
    typeof (value as { workerName?: unknown }).workerName === 'string'
  )
}
