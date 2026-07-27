import { writeFile } from 'node:fs/promises'
import { applyEdits, modify } from 'jsonc-parser'
import type { SECRET_ENV } from '../../types'
import { SelfHostError } from '../../utils/errors'
import { paths } from '../../utils/paths'
import type { FileRule } from './types'
import { assertFileExists, parseJsoncFile, readExistingFile } from './utils'

const WORKER_NAME_PATTERN = /^[a-zA-Z0-9-]+$/

const EDGE_LABEL = 'packages/edge/wrangler.jsonc'
const PORTAL_LABEL = 'packages/portal/wrangler.jsonc'

type WranglerConfig = {
  readonly name?: unknown
  readonly d1_databases?: readonly WranglerBinding[]
  readonly r2_buckets?: readonly WranglerBinding[]
  readonly routes?: unknown
}

type WranglerBinding = {
  readonly binding?: unknown
}

type CustomDomainRoute = {
  readonly pattern: string
  readonly custom_domain: true
}

type RateLimitBinding = {
  readonly name: string
  readonly namespace_id: string
  readonly simple: {
    readonly limit: number
    readonly period: 60
  }
}

type WorkerProject = 'edge' | 'portal'

const isWranglerBinding = (value: unknown): value is WranglerBinding => {
  return value !== null && typeof value === 'object' && 'binding' in value
}

const wranglerConfigFromValue = (value: unknown, label: string): WranglerConfig => {
  if (value !== null && typeof value === 'object') return value
  throw new SelfHostError(`${label} must be a JSON object.`)
}

const wranglerConfig = async (
  path: string,
  label: string,
): Promise<WranglerConfig> => {
  return wranglerConfigFromValue(
    parseJsoncFile(await readExistingFile(path, label), label),
    label,
  )
}

const validateWorkerConfig = (config: WranglerConfig, label: string): void => {
  if (typeof config.name !== 'string') {
    throw new SelfHostError(`${label} must include a string name.`)
  }
  if (config.routes === undefined || Array.isArray(config.routes)) return
  throw new SelfHostError(`${label} routes must be an array when provided.`)
}

const bindingIndex = (
  bindings: unknown,
  binding: string,
  section: string,
  label: string,
): number => {
  if (!Array.isArray(bindings) || !bindings.every(isWranglerBinding)) {
    throw new SelfHostError(`${label} must include a ${section} array.`)
  }

  const index = bindings.findIndex(item => item.binding === binding)
  if (index >= 0) return index
  throw new SelfHostError(`${label} ${section} is missing the ${binding} binding.`)
}

const applyModification = (
  contents: string,
  path: readonly (number | string)[],
  value: unknown,
): string => {
  const edits = modify(contents, [...path], value, {
    formattingOptions: {
      insertSpaces: true,
      tabSize: 2,
    },
  })

  return applyEdits(contents, edits)
}

const workerName = (secretEnv: SECRET_ENV, project: WorkerProject): string => {
  const name = secretEnv.config[project].workerName
  if (WORKER_NAME_PATTERN.test(name)) return name

  throw new SelfHostError(
    `secret.config.json ${project}.workerName must use only letters, numbers, and dashes.`,
  )
}

const edgeRequiredSecrets = (): readonly string[] => {
  return [
    'R2_ACCOUNT_ID',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_BUCKET_NAME',
    'ETH_ALCHEMY_API_KEY',
    'ETH_INFURA_API_KEY',
  ]
}

const edgeRateLimits = (secretEnv: SECRET_ENV): readonly RateLimitBinding[] => {
  const edgeName = workerName(secretEnv, 'edge')

  return [
    {
      name: 'CREATE_SECRET_LIMITER',
      namespace_id: `${edgeName}-create`,
      simple: {
        limit: 15,
        period: 60,
      },
    },
    {
      name: 'CHAIN_LIMITER',
      namespace_id: `${edgeName}-chain`,
      simple: {
        limit: 20,
        period: 60,
      },
    },
  ]
}

const customDomainRoutes = (
  secretEnv: SECRET_ENV,
  project: WorkerProject,
): readonly CustomDomainRoute[] => {
  return [
    {
      pattern: new URL(secretEnv.config[project].origin).hostname,
      custom_domain: true,
    },
  ]
}

const writeEdgeWrangler = async (secretEnv: SECRET_ENV): Promise<void> => {
  const contents = await readExistingFile(paths.edgeWrangler, EDGE_LABEL)
  const config = wranglerConfigFromValue(
    parseJsoncFile(contents, EDGE_LABEL),
    EDGE_LABEL,
  )
  const d1Index = bindingIndex(config.d1_databases, 'DB', 'd1_databases', EDGE_LABEL)
  const r2Index = bindingIndex(config.r2_buckets, 'FILES', 'r2_buckets', EDGE_LABEL)
  const next = applyModification(
    applyModification(
      applyModification(
        applyModification(
          applyModification(
            applyModification(
              applyModification(contents, ['name'], workerName(secretEnv, 'edge')),
              ['secrets', 'required'],
              edgeRequiredSecrets(),
            ),
            ['ratelimits'],
            edgeRateLimits(secretEnv),
          ),
          ['routes'],
          customDomainRoutes(secretEnv, 'edge'),
        ),
        ['d1_databases', d1Index, 'database_id'],
        secretEnv.env.D1_DATABASE_ID,
      ),
      ['d1_databases', d1Index, 'database_name'],
      secretEnv.env.D1_DATABASE_NAME,
    ),
    ['r2_buckets', r2Index, 'bucket_name'],
    secretEnv.env.R2_BUCKET_NAME,
  )

  await writeFile(paths.edgeWrangler, next, 'utf8')
}

const edgeWranglerJsoncRule = (): FileRule => {
  return {
    label: EDGE_LABEL,
    path: paths.edgeWrangler,
    validateParse: async () => {
      const config = await wranglerConfig(paths.edgeWrangler, EDGE_LABEL)
      validateWorkerConfig(config, EDGE_LABEL)
      bindingIndex(config.d1_databases, 'DB', 'd1_databases', EDGE_LABEL)
      bindingIndex(config.r2_buckets, 'FILES', 'r2_buckets', EDGE_LABEL)
    },
    validateTarget: async () => {
      await assertFileExists(paths.edgeWrangler, EDGE_LABEL)
    },
    write: writeEdgeWrangler,
  }
}

const writePortalWrangler = async (secretEnv: SECRET_ENV): Promise<void> => {
  const contents = await readExistingFile(paths.portalWrangler, PORTAL_LABEL)
  const next = applyModification(
    applyModification(contents, ['name'], workerName(secretEnv, 'portal')),
    ['routes'],
    customDomainRoutes(secretEnv, 'portal'),
  )

  await writeFile(paths.portalWrangler, next, 'utf8')
}

const portalWranglerJsoncRule = (): FileRule => {
  return {
    label: PORTAL_LABEL,
    path: paths.portalWrangler,
    validateParse: async () => {
      const config = await wranglerConfig(paths.portalWrangler, PORTAL_LABEL)
      validateWorkerConfig(config, PORTAL_LABEL)
    },
    validateTarget: async () => {
      await assertFileExists(paths.portalWrangler, PORTAL_LABEL)
    },
    write: writePortalWrangler,
  }
}

export const wranglerJsoncRules: readonly FileRule[] = [
  edgeWranglerJsoncRule(),
  portalWranglerJsoncRule(),
]
