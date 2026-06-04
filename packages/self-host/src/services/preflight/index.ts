import { Service } from 'func'

import type { EnvRecord, SelfHostConfig } from '@/types'
import { loading } from '@/utils/terminal'
import { configPreflight, requireConfig } from './config'
import { d1Preflight } from './d1'
import { envPreflight, requireEnv } from './env'
import { limitsPreflight } from './limits'
import { originsPreflight } from './origins'
import { r2Preflight } from './r2'
import type { PreflightCheck, PreflightContext } from './types'
import { wranglerAuthPreflight, wranglerInstallPreflight } from './wrangler'

const LOCAL_PREFLIGHT_CHECKS: readonly PreflightCheck[] = [
  wranglerInstallPreflight,
  envPreflight,
  configPreflight,
  originsPreflight,
  limitsPreflight,
]

const CLOUDFLARE_PREFLIGHT_CHECKS: readonly PreflightCheck[] = [
  wranglerAuthPreflight,
  d1Preflight,
  r2Preflight,
]

@Service()
export class PreflightService {
  async run(): Promise<{
    readonly config: SelfHostConfig
    readonly env: EnvRecord
  }> {
    const context: PreflightContext = {}

    await runChecks(
      'Checking local setup...',
      'Local setup checked.',
      context,
      LOCAL_PREFLIGHT_CHECKS,
    )
    await runChecks(
      'Checking Cloudflare resources...',
      'Cloudflare resources checked.',
      context,
      CLOUDFLARE_PREFLIGHT_CHECKS,
    )

    return {
      config: requireConfig(context),
      env: requireEnv(context),
    }
  }
}

async function runChecks(
  text: string,
  successText: string,
  context: PreflightContext,
  checks: readonly PreflightCheck[],
): Promise<void> {
  const task = loading(text)
  try {
    for (const check of checks) {
      task.text(`${text} (${check.label})`)
      await check.run(context)
    }
    task.succeed(successText)
  } catch (error) {
    task.fail(`${text.replace(/\.\.\.$/, '')} failed.`)
    throw error
  }
}
