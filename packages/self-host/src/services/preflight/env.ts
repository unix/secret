import { access } from 'node:fs/promises'
import type { EnvRecord } from '../../types'
import { missingEnvKeys, readEnvFile } from '../../utils/env'
import { SelfHostError } from '../../utils/errors'
import { paths } from '../../utils/paths'
import type { PreflightCheck, PreflightContext } from './types'

const REQUIRED_ENV_KEYS = [
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
  'D1_DATABASE_ID',
  'D1_DATABASE_NAME',
] as const

export const envPreflight: PreflightCheck = {
  label: 'env',
  run: async context => {
    await assertEnvFile()
    const env = await readEnvFile(paths.rootEnv)
    assertEnvComplete(env)
    context.env = env
  },
}

export const requireEnv = (context: PreflightContext): EnvRecord => {
  if (context.env) return context.env

  throw new SelfHostError('Preflight order error: env is not loaded yet.')
}

const assertEnvFile = async (): Promise<void> => {
  try {
    await access(paths.rootEnv)
  } catch {
    throw new SelfHostError(
      'No .env file was found at the project root. Fill out .env.example and rename it to .env.',
    )
  }
}

const assertEnvComplete = (env: EnvRecord): void => {
  const missing = missingEnvKeys(env, REQUIRED_ENV_KEYS)
  if (missing.length === 0) return

  throw new SelfHostError(
    `The root .env file is missing required values: ${missing.join(', ')}`,
  )
}
