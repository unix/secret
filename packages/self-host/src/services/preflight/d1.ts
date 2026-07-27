import { SelfHostError } from '../../utils/errors'
import { requireEnv } from './env'
import type { PreflightCheck } from './types'
import { wranglerJson } from './wrangler'

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return value !== null && typeof value === 'object'
}

const stringValue = (value: unknown, keys: readonly string[]): string | null => {
  if (!isRecord(value)) return null

  for (const key of keys) {
    if (typeof value[key] === 'string') return value[key]
  }

  return null
}

export const d1Preflight: PreflightCheck = {
  label: 'd1',
  run: async context => {
    const env = requireEnv(context)
    const info = await wranglerJson(
      ['d1', 'info', env.D1_DATABASE_NAME, '--json'],
      env,
      {
        failure:
          'D1 check failed. Verify your Wrangler session, R2_ACCOUNT_ID, and D1_DATABASE_NAME.',
      },
    )
    const databaseId = stringValue(info, ['uuid', 'id', 'database_id'])
    if (databaseId && databaseId !== env.D1_DATABASE_ID) {
      throw new SelfHostError(
        `D1_DATABASE_ID does not match the remote database ID: .env=${env.D1_DATABASE_ID}, remote=${databaseId}`,
      )
    }

    const name = stringValue(info, ['name'])
    if (name && name !== env.D1_DATABASE_NAME) {
      throw new SelfHostError(
        `D1_DATABASE_NAME does not match the remote database name: .env=${env.D1_DATABASE_NAME}, remote=${name}`,
      )
    }
  },
}
