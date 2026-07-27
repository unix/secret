import { writeFile } from 'node:fs/promises'
import type { GeneratedProject, SECRET_ENV } from '../../types'
import { SelfHostError } from '../../utils/errors'
import { generatedSelfHostFile } from '../../utils/generated'
import { paths } from '../../utils/paths'
import type { FileRule } from './types'
import { parseJsonFile, readOptionalFile } from './utils'

const SELF_HOST_EXPORT_PATTERN =
  /export\s+const\s+selfHost\s*=\s*([\s\S]*?)\s+as\s+const/

type SelfHostRuleInput = {
  readonly label: string
  readonly path: string
  readonly project: GeneratedProject
}

const parseSelfHost = (contents: string, label: string): void => {
  const match = SELF_HOST_EXPORT_PATTERN.exec(contents)
  if (!match) {
    throw new SelfHostError(`${label} does not have a readable selfHost export.`)
  }

  parseJsonFile(match[1], label)
}

const selfHostRule = ({ label, path, project }: SelfHostRuleInput): FileRule => {
  return {
    label,
    path,
    validateParse: async () => {
      const contents = await readOptionalFile(path)
      if (contents === null) return
      parseSelfHost(contents, label)
    },
    validateTarget: async () => {
      return
    },
    write: async (secretEnv: SECRET_ENV) => {
      await writeFile(path, generatedSelfHostFile(project, secretEnv.config), 'utf8')
    },
  }
}

export const selfHostRules: readonly FileRule[] = [
  selfHostRule({
    label: 'packages/cli/self-host.ts',
    path: paths.cliSelfHost,
    project: 'cli',
  }),
  selfHostRule({
    label: 'packages/edge/self-host.ts',
    path: paths.edgeSelfHost,
    project: 'edge',
  }),
  selfHostRule({
    label: 'packages/portal/self-host.ts',
    path: paths.portalSelfHost,
    project: 'portal',
  }),
]
