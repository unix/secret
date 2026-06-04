import { writeFile } from 'node:fs/promises'

import type { SECRET_ENV } from '@/types'
import { SelfHostError } from '@/utils/errors'
import { paths } from '@/utils/paths'
import type { FileRule } from './types'
import { assertFileExists, parseJsonFile, readExistingFile } from './utils'

const LABEL = 'packages/edge/r2-cors.json'
const DEV_ORIGINS = ['http://localhost:4321', 'http://localhost:3000'] as const

type R2Cors = {
  readonly rules?: readonly R2CorsRule[]
}

type R2CorsRule = {
  readonly allowed?: {
    readonly headers?: readonly string[]
    readonly methods?: readonly string[]
    readonly origins?: readonly string[]
  }
  readonly exposeHeaders?: readonly string[]
  readonly maxAgeSeconds?: number
}

export const r2CorsJsonRule: FileRule = {
  label: LABEL,
  path: paths.edgeR2Cors,
  validateParse,
  validateTarget,
  write,
}

async function validateTarget(): Promise<void> {
  await assertFileExists(paths.edgeR2Cors, LABEL)
}

async function validateParse(): Promise<void> {
  const parsed = await r2Cors()
  if (!Array.isArray(parsed.rules)) {
    throw new SelfHostError(`${LABEL} must include a rules array.`)
  }
}

async function write(secretEnv: SECRET_ENV): Promise<void> {
  const parsed = await r2Cors()
  const rules = Array.isArray(parsed.rules) ? parsed.rules : []
  const [firstRule, ...restRules] = rules
  const next: R2Cors = {
    ...parsed,
    rules: [
      {
        ...firstRule,
        allowed: {
          ...firstRule?.allowed,
          origins: [...DEV_ORIGINS, secretEnv.config.portal.origin],
        },
      },
      ...restRules,
    ],
  }

  await writeFile(paths.edgeR2Cors, `${JSON.stringify(next, null, 2)}\n`, 'utf8')
}

async function r2Cors(): Promise<R2Cors> {
  return parseJsonFile<R2Cors>(
    await readExistingFile(paths.edgeR2Cors, LABEL),
    LABEL,
  )
}
