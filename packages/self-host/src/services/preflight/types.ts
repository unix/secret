import type { EnvRecord, SelfHostConfig } from '../../types'

export type PreflightContext = {
  config?: SelfHostConfig
  env?: EnvRecord
}

export type PreflightCheck = {
  readonly label: string
  readonly run: (context: PreflightContext) => Promise<void>
}
