import type { SECRET_ENV } from '../../types'
import { devVarsRule } from './dev-vars'
import { r2CorsJsonRule } from './r2-cors.json'
import { selfHostRules } from './self-host'
import type { FileRule } from './types'
import { wranglerJsoncRules } from './wrangler.jsonc'

export const fileRules: readonly FileRule[] = [
  ...selfHostRules,
  devVarsRule,
  ...wranglerJsoncRules,
  r2CorsJsonRule,
]

export const validateFileRules = async (secretEnv: SECRET_ENV): Promise<void> => {
  for (const rule of fileRules) {
    await rule.validateTarget(secretEnv)
    await rule.validateParse(secretEnv)
  }
}

export const writeFileRules = async (
  secretEnv: SECRET_ENV,
  onStatus?: (status: string) => void,
): Promise<readonly string[]> => {
  const files: string[] = []
  for (const rule of fileRules) {
    onStatus?.(`${rule.actionLabel ?? 'Generating'} ${rule.label}...`)
    await rule.write(secretEnv)
    await rule.validateParse(secretEnv)
    files.push(rule.path)
  }

  return files
}
