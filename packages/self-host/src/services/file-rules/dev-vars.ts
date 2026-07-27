import { access, readFile, writeFile } from 'node:fs/promises'
import { readEnvFile } from '../../utils/env'
import { paths } from '../../utils/paths'
import type { FileRule } from './types'

const LABEL = 'packages/edge/.dev.vars'
const OPTIONAL_SECRET_KEYS = ['ETH_ALCHEMY_API_KEY', 'ETH_INFURA_API_KEY'] as const

const validateTarget = async (): Promise<void> => {
  return
}

const devVarsPath = async (): Promise<string> => {
  try {
    await access(paths.edgeDevVars)
    return paths.edgeDevVars
  } catch {
    return paths.rootEnv
  }
}

const validateParse = async (): Promise<void> => {
  await readEnvFile(await devVarsPath())
}

const hasEnvKey = (contents: string, key: string): boolean => {
  const pattern = new RegExp(`^${key}\\s*=`)

  return contents.split(/\r?\n/).some(line => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return false
    return pattern.test(trimmed)
  })
}

const withOptionalSecrets = (contents: string): string => {
  const missing = OPTIONAL_SECRET_KEYS.filter(key => !hasEnvKey(contents, key))
  if (missing.length === 0) return contents
  const prefix = contents.replace(/\s*$/, '\n')
  const suffix = missing.map(key => `${key}=`).join('\n')
  return `${prefix}${suffix}\n`
}

const write = async (): Promise<void> => {
  const contents = await readFile(paths.rootEnv, 'utf8')
  await writeFile(paths.edgeDevVars, withOptionalSecrets(contents))
}

export const devVarsRule: FileRule = {
  actionLabel: 'Copying',
  label: LABEL,
  path: paths.edgeDevVars,
  validateParse,
  validateTarget,
  write,
}
