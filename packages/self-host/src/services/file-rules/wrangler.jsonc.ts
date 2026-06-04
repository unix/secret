import { writeFile } from 'node:fs/promises'

import { applyEdits, modify } from 'jsonc-parser'

import type { SECRET_ENV } from '@/types'
import { SelfHostError } from '@/utils/errors'
import { paths } from '@/utils/paths'
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

type WorkerProject = 'edge' | 'portal'

export const wranglerJsoncRules: readonly FileRule[] = [
  edgeWranglerJsoncRule(),
  portalWranglerJsoncRule(),
]

function edgeWranglerJsoncRule(): FileRule {
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

function portalWranglerJsoncRule(): FileRule {
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

async function writeEdgeWrangler(secretEnv: SECRET_ENV): Promise<void> {
  const contents = await readExistingFile(paths.edgeWrangler, EDGE_LABEL)
  const config = parseJsoncFile<WranglerConfig>(contents, EDGE_LABEL)
  const d1Index = bindingIndex(config.d1_databases, 'DB', 'd1_databases', EDGE_LABEL)
  const r2Index = bindingIndex(config.r2_buckets, 'FILES', 'r2_buckets', EDGE_LABEL)
  const next = applyModification(
    applyModification(
      applyModification(
        applyModification(
          applyModification(contents, ['name'], workerName(secretEnv, 'edge')),
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

async function writePortalWrangler(secretEnv: SECRET_ENV): Promise<void> {
  const contents = await readExistingFile(paths.portalWrangler, PORTAL_LABEL)
  const next = applyModification(
    applyModification(contents, ['name'], workerName(secretEnv, 'portal')),
    ['routes'],
    customDomainRoutes(secretEnv, 'portal'),
  )

  await writeFile(paths.portalWrangler, next, 'utf8')
}

async function wranglerConfig(path: string, label: string): Promise<WranglerConfig> {
  return parseJsoncFile<WranglerConfig>(await readExistingFile(path, label), label)
}

function validateWorkerConfig(config: WranglerConfig, label: string): void {
  if (typeof config.name !== 'string') {
    throw new SelfHostError(`${label} must include a string name.`)
  }
  if (config.routes === undefined || Array.isArray(config.routes)) return

  throw new SelfHostError(`${label} routes must be an array when provided.`)
}

function bindingIndex(
  bindings: readonly WranglerBinding[] | undefined,
  binding: string,
  section: string,
  label: string,
): number {
  if (!Array.isArray(bindings)) {
    throw new SelfHostError(`${label} must include a ${section} array.`)
  }

  const index = bindings.findIndex(item => item.binding === binding)
  if (index >= 0) return index

  throw new SelfHostError(`${label} ${section} is missing the ${binding} binding.`)
}

function workerName(secretEnv: SECRET_ENV, project: WorkerProject): string {
  const name = secretEnv.config[project].workerName
  if (WORKER_NAME_PATTERN.test(name)) return name

  throw new SelfHostError(
    `secret.config.json ${project}.workerName must use only letters, numbers, and dashes.`,
  )
}

function customDomainRoutes(
  secretEnv: SECRET_ENV,
  project: WorkerProject,
): readonly CustomDomainRoute[] {
  return [
    {
      pattern: new URL(secretEnv.config[project].origin).hostname,
      custom_domain: true,
    },
  ]
}

function applyModification(
  contents: string,
  path: readonly (number | string)[],
  value: unknown,
): string {
  const edits = modify(contents, [...path], value, {
    formattingOptions: {
      insertSpaces: true,
      tabSize: 2,
    },
  })

  return applyEdits(contents, edits)
}
