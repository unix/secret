import { readFile } from 'node:fs/promises'
import type { EnvRecord } from '../types'

const ENV_LINE_PATTERN = /^([\w.-]+)\s*=\s*(.*)$/

const unquote = (value: string): string => {
  if (value.length < 2) return value
  const quote = value[0]
  if ((quote !== '"' && quote !== "'") || !value.endsWith(quote)) return value
  return value.slice(1, -1)
}

export const parseEnv = (raw: string): EnvRecord => {
  const env: EnvRecord = {}
  raw.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const match = ENV_LINE_PATTERN.exec(trimmed)
    if (!match) return
    env[match[1]] = unquote(match[2].trim())
  })

  return env
}

export const readEnvFile = async (path: string): Promise<EnvRecord> => {
  return parseEnv(await readFile(path, 'utf8'))
}

const isMissingEnvValue = (value: string | undefined): boolean => {
  if (!value) return true
  const normalized = value.trim().toLowerCase()

  return (
    normalized === '...' ||
    normalized === 'changeme' ||
    normalized === 'todo' ||
    normalized.startsWith('<') ||
    normalized.startsWith('your_')
  )
}

export const missingEnvKeys = (
  env: EnvRecord,
  requiredKeys: readonly string[],
): readonly string[] => {
  return requiredKeys.filter(key => isMissingEnvValue(env[key]))
}
