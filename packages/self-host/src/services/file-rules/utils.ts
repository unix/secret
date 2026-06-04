import { access, readFile } from 'node:fs/promises'

import { parse as parseJsonc, type ParseError } from 'jsonc-parser'

import { SelfHostError } from '@/utils/errors'

export const assertFileExists = async (
  path: string,
  label: string,
): Promise<void> => {
  try {
    await access(path)
  } catch {
    throw new SelfHostError(`${label} was not found: ${path}`)
  }
}

export const readExistingFile = async (
  path: string,
  label: string,
): Promise<string> => {
  try {
    return await readFile(path, 'utf8')
  } catch {
    throw new SelfHostError(`Could not read ${label}: ${path}`)
  }
}

export const readOptionalFile = async (path: string): Promise<string | null> => {
  try {
    return await readFile(path, 'utf8')
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') return null

    throw error
  }
}

export const parseJsonFile = <T>(contents: string, label: string): T => {
  try {
    return JSON.parse(contents) as T
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    throw new SelfHostError(`${label} is not valid JSON: ${message}`)
  }
}

export const parseJsoncFile = <T>(contents: string, label: string): T => {
  const errors: ParseError[] = []
  const parsed = parseJsonc(contents, errors, { allowTrailingComma: true })
  if (errors.length > 0) {
    throw new SelfHostError(
      `${label} is not valid JSONC: ${errors.map(error => error.error).join(', ')}`,
    )
  }

  return parsed as T
}

const isNodeError = (error: unknown): error is NodeJS.ErrnoException => {
  return error !== null && typeof error === 'object' && 'code' in error
}
