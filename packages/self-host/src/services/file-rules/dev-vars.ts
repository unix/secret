import { access, copyFile } from 'node:fs/promises'

import type { SECRET_ENV } from '@/types'
import { readEnvFile } from '@/utils/env'
import { paths } from '@/utils/paths'
import type { FileRule } from './types'

const LABEL = 'packages/edge/.dev.vars'

export const devVarsRule: FileRule = {
  actionLabel: 'Copying',
  label: LABEL,
  path: paths.edgeDevVars,
  validateParse,
  validateTarget,
  write,
}

async function validateTarget(): Promise<void> {
  return
}

async function validateParse(): Promise<void> {
  await readEnvFile(await devVarsPath())
}

async function write(_secretEnv: SECRET_ENV): Promise<void> {
  await copyFile(paths.rootEnv, paths.edgeDevVars)
}

async function devVarsPath(): Promise<string> {
  try {
    await access(paths.edgeDevVars)

    return paths.edgeDevVars
  } catch {
    return paths.rootEnv
  }
}
