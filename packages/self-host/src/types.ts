export type EnvRecord = Record<string, string>

export type SelfHostConfig = {
  readonly schemaVersion: number
  readonly portal: PortalConfigSection
  readonly edge: ConfigSection
  readonly limits: Record<string, unknown>
}

export type ConfigSection = Record<string, unknown> & {
  readonly origin: string
  readonly workerName: string
}

export type PortalConfigSection = ConfigSection & {
  readonly ga4?: string
}

export type PreflightResult = {
  readonly config: SelfHostConfig
  readonly env: EnvRecord
}

export type SECRET_ENV = PreflightResult

export type GeneratedProject = 'cli' | 'edge' | 'portal'
