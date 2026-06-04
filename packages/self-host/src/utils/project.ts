import { readFile, stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { SelfHostError } from './errors'
import { configureProjectRoot } from './paths'

const SECRET_PROJECT_NAME = 'secret-workspace'
const NOT_FOUND_PROJECT_MESSAGE =
  'This command must be run from the secret project root. Clone the secret project first, then run this command inside the project directory.'

export const assertSecretProjectRoot = async (): Promise<void> => {
  const root = await secretProjectRoot(process.cwd())
  if (root) {
    configureProjectRoot(root)
    return
  }

  const initCwdRoot = process.env.INIT_CWD
    ? await secretProjectRoot(process.env.INIT_CWD)
    : null
  if (initCwdRoot) {
    configureProjectRoot(initCwdRoot)
    console.log(`Using INIT_CWD to locate secret project root: ${initCwdRoot}`)
    return
  }

  throw new SelfHostError(NOT_FOUND_PROJECT_MESSAGE, 'NOT-FOUND-PROJECT')
}

const isPackageJson = (value: unknown): value is { readonly name?: unknown } => {
  return Boolean(value) && typeof value === 'object'
}

const secretProjectRoot = async (root: string): Promise<string | null> => {
  const candidate = resolve(root)
  const packageJson = await readPackageJson(candidate)
  if (!isPackageJson(packageJson) || packageJson.name !== SECRET_PROJECT_NAME) {
    return null
  }

  const hasPackages = await isDirectory(join(candidate, 'packages'))
  const hasEdge = await isDirectory(join(candidate, 'packages', 'edge'))
  const hasPortal = await isDirectory(join(candidate, 'packages', 'portal'))
  if (hasPackages && hasEdge && hasPortal) return candidate

  return null
}

const readPackageJson = async (root: string): Promise<unknown> => {
  try {
    return JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
  } catch {
    return null
  }
}

const isDirectory = async (path: string): Promise<boolean> => {
  try {
    return (await stat(path)).isDirectory()
  } catch {
    return false
  }
}
