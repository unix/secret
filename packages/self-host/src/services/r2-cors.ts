import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { Service } from 'func'
import type { EnvRecord } from '../types'
import { SelfHostError } from '../utils/errors'
import { paths } from '../utils/paths'
import { loading } from '../utils/terminal'

const execFileAsync = promisify(execFile)

@Service()
export class R2CorsService {
  async apply({ env }: { readonly env: EnvRecord }): Promise<void> {
    const task = loading('Applying R2 CORS policy...')
    try {
      await applyR2Cors(env)
      task.succeed('R2 CORS policy applied.')
    } catch (error) {
      task.fail('R2 CORS configuration failed.')
      throw r2CorsError(error)
    }
  }
}

const applyR2Cors = async (env: EnvRecord): Promise<void> => {
  await execFileAsync(
    'pnpm',
    [
      'wrangler',
      'r2',
      'bucket',
      'cors',
      'set',
      env.R2_BUCKET_NAME,
      '--file',
      'r2-cors.json',
    ],
    {
      cwd: paths.edgePackage,
      env: {
        ...process.env,
        CLOUDFLARE_ACCOUNT_ID: env.R2_ACCOUNT_ID,
      },
    },
  )
}

const r2CorsError = (error: unknown): SelfHostError => {
  if (isNodeError(error) && error.code === 'ENOENT') {
    return new SelfHostError(
      'R2 CORS configuration failed. pnpm was not found. Install pnpm and rerun the setup command.',
      'R2-CORS-FAILED',
    )
  }

  return new SelfHostError(
    `R2 CORS configuration failed. Verify your Wrangler session, R2_ACCOUNT_ID, and R2_BUCKET_NAME, then rerun the setup command.${errorMessage(error)}`,
    'R2-CORS-FAILED',
  )
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
