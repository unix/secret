import { access, copyFile } from 'node:fs/promises'
import type { SECRET_ENV } from '../../types'
import { readEnvFile } from '../../utils/env'
import { paths } from '../../utils/paths'
import type { FileRule } from './types'

const LABEL = 'packages/edge/.dev.vars'

const validateTarget = async (): Promise<void> => {
  return
}

const validateParse = async (): Promise<void> => {
  await readEnvFile(await devVarsPath())
}

const write = async (_secretEnv: SECRET_ENV): Promise<void> => {
  await copyFile(paths.rootEnv, paths.edgeDevVars)
}

const devVarsPath = async (): Promise<string> => {
  try {
    await access(paths.edgeDevVars)

    return paths.edgeDevVars
  } catch {
    return paths.rootEnv
  }
}

export const devVarsRule: FileRule = {
  actionLabel: 'Copying',
  label: LABEL,
  path: paths.edgeDevVars,
  validateParse,
  validateTarget,
  write,
}
