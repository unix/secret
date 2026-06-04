import type { SECRET_ENV } from '../../types'

export type FileRule = {
  readonly actionLabel?: string
  readonly label: string
  readonly path: string
  readonly validateParse: (secretEnv: SECRET_ENV) => Promise<void>
  readonly validateTarget: (secretEnv: SECRET_ENV) => Promise<void>
  readonly write: (secretEnv: SECRET_ENV) => Promise<void>
}
