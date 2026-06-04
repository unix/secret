import { constants } from 'node:fs'
import { access, mkdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

import { CONFIG_DIR_NAME, CONFIG_FILE_NAME } from '../utils/constants'

export const configDir = (): string => {
  return join(homedir(), CONFIG_DIR_NAME)
}

export const configFile = (): string => {
  return join(configDir(), CONFIG_FILE_NAME)
}

export const ensureConfigDir = async (): Promise<void> => {
  const directory = configDir()
  try {
    await access(directory, constants.W_OK | constants.X_OK)
    return
  } catch (error) {
    if (!isNodeError(error) || error.code !== 'ENOENT') {
      throw configAccessError(directory, error)
    }
  }

  await assertWritableDirectory(dirname(directory))
  try {
    await mkdir(directory, { recursive: true, mode: 0o700 })
  } catch (error) {
    throw configAccessError(directory, error)
  }
}

const assertWritableDirectory = async (directory: string): Promise<void> => {
  try {
    await access(directory, constants.W_OK | constants.X_OK)
  } catch (error) {
    throw configAccessError(directory, error)
  }
}

const configAccessError = (path: string, error: unknown): Error => {
  const reason = isNodeError(error) ? ` ${error.message}` : ''

  return new Error(
    `Cannot access the config path ${path}.${reason} Check the directory permissions or choose a writable home directory.`,
  )
}

const isNodeError = (error: unknown): error is NodeJS.ErrnoException => {
  return error instanceof Error && 'code' in error
}
