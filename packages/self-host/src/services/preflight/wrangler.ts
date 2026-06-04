import { execFile } from 'node:child_process'
import { access } from 'node:fs/promises'
import { promisify } from 'node:util'
import type { EnvRecord } from '../../types'
import { SelfHostError } from '../../utils/errors'
import { paths, projectRoot } from '../../utils/paths'
import type { PreflightCheck } from './types'

const execFileAsync = promisify(execFile)

type WranglerFailure = {
  readonly failure: string
}

export const wranglerInstallPreflight: PreflightCheck = {
  label: 'wrangler',
  run: async context => {
    await assertWranglerInstalled()
  },
}

export const wranglerAuthPreflight: PreflightCheck = {
  label: 'wrangler-auth',
  run: async context => {
    await wranglerJson(['whoami', '--json'], context.env, {
      failure:
        'Wrangler authentication check failed. Run pnpm wrangler login first.',
    })
  },
}

export const wranglerJson = async (
  args: readonly string[],
  env: EnvRecord | undefined,
  { failure }: WranglerFailure,
): Promise<unknown> => {
  let stdout: string
  try {
    const result = await execFileAsync(paths.rootWrangler, args, {
      cwd: projectRoot,
      env: {
        ...process.env,
        ...accountEnv(env),
      },
    })
    stdout = result.stdout
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      throw new SelfHostError(
        'Root Wrangler was not found. Run pnpm install so root devDependencies are available.',
      )
    }

    throw new SelfHostError(`${failure}${errorMessage(error)}`)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(stdout)
  } catch {
    throw new SelfHostError(`${failure} Wrangler returned invalid JSON.`)
  }

  return parsed
}

const accountEnv = (
  env: EnvRecord | undefined,
): { readonly CLOUDFLARE_ACCOUNT_ID?: string } => {
  if (!env?.R2_ACCOUNT_ID) return {}

  return { CLOUDFLARE_ACCOUNT_ID: env.R2_ACCOUNT_ID }
}

const assertWranglerInstalled = async (): Promise<void> => {
  try {
    await access(paths.rootWrangler)
  } catch {
    throw new SelfHostError(
      'Project dependencies are not installed. Run pnpm install at the project root first.',
    )
  }
}

const errorMessage = (error: unknown): string => {
  if (!isNodeError(error)) return ''

  const details = [error.stderr, error.stdout, error.message]
    .filter(Boolean)
    .join('\n')
    .trim()

  return details ? `\n${details.slice(0, 1000)}` : ''
}

const isNodeError = (
  error: unknown,
): error is Error & {
  readonly code?: string
  readonly stderr?: string
  readonly stdout?: string
} => {
  return error instanceof Error
}
