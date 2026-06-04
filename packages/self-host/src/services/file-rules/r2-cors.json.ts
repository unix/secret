import { writeFile } from 'node:fs/promises'
import type { SECRET_ENV } from '../../types'
import { SelfHostError } from '../../utils/errors'
import { paths } from '../../utils/paths'
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

const validateTarget = async (): Promise<void> => {
  await assertFileExists(paths.edgeR2Cors, LABEL)
}

const validateParse = async (): Promise<void> => {
  const parsed = await r2Cors()
  if (!Array.isArray(parsed.rules)) {
    throw new SelfHostError(`${LABEL} must include a rules array.`)
  }
}

const write = async (secretEnv: SECRET_ENV): Promise<void> => {
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
          origins: allowedOrigins(
            firstRule?.allowed?.origins,
            secretEnv.config.portal.origin,
          ),
        },
      },
      ...restRules.map(localhostOnlyRule),
    ],
  }

  await writeFile(paths.edgeR2Cors, `${JSON.stringify(next, null, 2)}\n`, 'utf8')
}

const r2Cors = async (): Promise<R2Cors> => {
  const parsed = parseJsonFile(
    await readExistingFile(paths.edgeR2Cors, LABEL),
    LABEL,
  )
  if (isR2Cors(parsed)) return parsed

  throw new SelfHostError(`${LABEL} must be a JSON object.`)
}

const allowedOrigins = (
  origins: readonly string[] | undefined,
  portalOrigin: string,
): readonly string[] => {
  return uniqueOrigins([
    ...DEV_ORIGINS,
    ...(origins ?? []).filter(isLocalhostOrigin),
    portalOrigin,
  ])
}

const uniqueOrigins = (origins: readonly string[]): readonly string[] => {
  return Array.from(new Set(origins))
}

const localhostOnlyRule = (rule: R2CorsRule): R2CorsRule => {
  if (!rule.allowed?.origins) return rule

  return {
    ...rule,
    allowed: {
      ...rule.allowed,
      origins: rule.allowed.origins.filter(isLocalhostOrigin),
    },
  }
}

const isLocalhostOrigin = (origin: string): boolean => {
  let url: URL
  try {
    url = new URL(origin)
  } catch {
    return false
  }

  return url.hostname === 'localhost'
}

const isR2Cors = (value: unknown): value is R2Cors => {
  return value !== null && typeof value === 'object'
}

export const r2CorsJsonRule: FileRule = {
  label: LABEL,
  path: paths.edgeR2Cors,
  validateParse,
  validateTarget,
  write,
}
