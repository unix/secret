import { readFile, writeFile } from 'node:fs/promises'
import { LOCAL, PRODUCTION } from '../utils/constants'
import { configFile, ensureConfigDir } from './files'
import { isLocalOrigin, isLocalRuntime } from './environment'
import { normalizeOrigin } from './origins'

export const CONFIG_KEYS = {
  ENDPOINTS: 'endpoints',
  CLEANUP_LAST_RUN_AT: 'cleanup.lastRunAt',
  ENDPOINTS_API: 'endpoints.api',
  ENDPOINTS_PORTAL: 'endpoints.portal',
} as const

type ConfigGetValue = {
  readonly [CONFIG_KEYS.ENDPOINTS]: ResolvedEndpoints
  readonly [CONFIG_KEYS.CLEANUP_LAST_RUN_AT]: number
  readonly [CONFIG_KEYS.ENDPOINTS_API]: string | undefined
  readonly [CONFIG_KEYS.ENDPOINTS_PORTAL]: string | undefined
}

type ConfigPutValue = {
  readonly [CONFIG_KEYS.CLEANUP_LAST_RUN_AT]: number
  readonly [CONFIG_KEYS.ENDPOINTS_API]: string
  readonly [CONFIG_KEYS.ENDPOINTS_PORTAL]: string
}

type ConfigGetOptions = {
  readonly [CONFIG_KEYS.ENDPOINTS]: EndpointOverrides
  readonly [CONFIG_KEYS.CLEANUP_LAST_RUN_AT]: undefined
  readonly [CONFIG_KEYS.ENDPOINTS_API]: undefined
  readonly [CONFIG_KEYS.ENDPOINTS_PORTAL]: undefined
}

type ConfigWritableKey = keyof ConfigPutValue

type ConfigGetter<Key extends keyof ConfigGetValue> = (
  config: StoredConfig,
  options?: ConfigGetOptions[Key],
) => ConfigGetValue[Key]

type ConfigWriter<Key extends ConfigWritableKey> = (
  config: StoredConfig,
  value: ConfigPutValue[Key],
) => StoredConfig

type EndpointOverrides = {
  readonly api?: string
  readonly portal?: string
}

type ResolvedEndpoints = {
  readonly apiOrigin: string
  readonly portalOrigin: string
}

type StoredConfig = {
  readonly cleanup?: {
    readonly lastRunAt?: number
  }
  readonly endpoints?: {
    readonly api?: string
    readonly portal?: string
  }
}

const CONFIG_GETTERS: {
  readonly [Key in keyof ConfigGetValue]: ConfigGetter<Key>
} = {
  [CONFIG_KEYS.ENDPOINTS]: (config, options) => {
    return endpointSectionValue(config, options)
  },
  [CONFIG_KEYS.CLEANUP_LAST_RUN_AT]: config => {
    return config.cleanup?.lastRunAt ?? 0
  },
  [CONFIG_KEYS.ENDPOINTS_API]: config => {
    return config.endpoints?.api
  },
  [CONFIG_KEYS.ENDPOINTS_PORTAL]: config => {
    return config.endpoints?.portal
  },
}

const CONFIG_WRITERS: {
  readonly [Key in ConfigWritableKey]: ConfigWriter<Key>
} = {
  [CONFIG_KEYS.CLEANUP_LAST_RUN_AT]: (config, value) => {
    return {
      ...config,
      cleanup: {
        ...config.cleanup,
        lastRunAt: value,
      },
    }
  },
  [CONFIG_KEYS.ENDPOINTS_API]: (config, value) => {
    return {
      ...config,
      endpoints: {
        ...config.endpoints,
        api: normalizeOrigin(value),
      },
    }
  },
  [CONFIG_KEYS.ENDPOINTS_PORTAL]: (config, value) => {
    return {
      ...config,
      endpoints: {
        ...config.endpoints,
        portal: normalizeOrigin(value),
      },
    }
  },
}

export const configs = {
  file: configFile,
  get: async <Key extends keyof ConfigGetValue>(
    key: Key,
    options?: ConfigGetOptions[Key],
  ): Promise<ConfigGetValue[Key]> => {
    const config = await readConfig()

    return CONFIG_GETTERS[key](config, options)
  },
  put: async <Key extends ConfigWritableKey>(
    key: Key,
    value: ConfigPutValue[Key],
  ): Promise<StoredConfig> => {
    const config = await readConfig()

    return writeNextConfig(CONFIG_WRITERS[key](config, value))
  },
  init: async (): Promise<StoredConfig> => {
    const config = await readConfig()
    if (config.cleanup) return config

    return writeNextConfig({
      ...config,
      cleanup: {
        lastRunAt: 0,
      },
    })
  },
}

const endpointSectionValue = (
  config: StoredConfig,
  overrides: EndpointOverrides = {},
): ResolvedEndpoints => {
  const defaultApi = isLocalRuntime()
    ? LOCAL.ENDPOINTS.API_ORIGIN
    : PRODUCTION.ENDPOINTS.API_ORIGIN
  const apiOrigin = normalizeOrigin(
    overrides.api ?? config.endpoints?.api ?? defaultApi,
  )
  const defaultPortal =
    isLocalRuntime() || isLocalOrigin(apiOrigin)
      ? LOCAL.ENDPOINTS.PORTAL_ORIGIN
      : PRODUCTION.ENDPOINTS.PORTAL_ORIGIN

  return {
    apiOrigin,
    portalOrigin: normalizeOrigin(
      overrides.portal ?? config.endpoints?.portal ?? defaultPortal,
    ),
  }
}

const readConfig = async (): Promise<StoredConfig> => {
  let raw: string
  try {
    raw = await readFile(configFile(), 'utf8')
  } catch (error) {
    if (isNodeError(error)) {
      if (error.code === 'ENOENT') return {}
      if (error.code === 'EACCES' || error.code === 'EPERM') {
        throw configAccessError('read', error)
      }
    }

    throw error
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    throw configFormatError(
      `The file is not valid JSON.${error instanceof Error ? ` ${error.message}` : ''}`,
    )
  }

  if (!isConfigObject(parsed)) {
    throw configFormatError('The file must contain a JSON object.')
  }

  return normalizeConfig(parsed)
}

const normalizeConfig = (value: object): StoredConfig => {
  const cleanup = normalizeCleanup(value)
  const endpoints = normalizeEndpoints(value)
  if (!cleanup && !endpoints) return {}

  return { cleanup, endpoints }
}

const normalizeCleanup = (value: object): StoredConfig['cleanup'] | undefined => {
  if (!('cleanup' in value)) return undefined
  if (!isConfigObject(value.cleanup)) {
    throw configFormatError('The "cleanup" field must be an object.')
  }
  if (
    'lastRunAt' in value.cleanup &&
    value.cleanup.lastRunAt !== undefined &&
    typeof value.cleanup.lastRunAt !== 'number'
  ) {
    throw configFormatError('The "cleanup.lastRunAt" field must be a number.')
  }
  if (typeof value.cleanup.lastRunAt === 'number') {
    return { lastRunAt: value.cleanup.lastRunAt }
  }

  return {}
}

const normalizeEndpoints = (
  value: object,
): StoredConfig['endpoints'] | undefined => {
  if ('endpoints' in value) {
    if (!isConfigObject(value.endpoints)) {
      throw configFormatError('The "endpoints" field must be an object.')
    }

    return normalizeEndpointValues(value.endpoints, 'endpoints')
  }

  return normalizeLegacyEndpointValues(value)
}

const normalizeEndpointValues = (
  value: object,
  path: 'endpoints' | 'legacy',
): NonNullable<StoredConfig['endpoints']> => {
  const endpoints: NonNullable<StoredConfig['endpoints']> = {}
  if ('api' in value && value.api !== undefined && typeof value.api !== 'string') {
    throw configFormatError(
      `The "${configFieldPath(path, 'api')}" field must be a string.`,
    )
  }
  if (
    'portal' in value &&
    value.portal !== undefined &&
    typeof value.portal !== 'string'
  ) {
    throw configFormatError(
      `The "${configFieldPath(path, 'portal')}" field must be a string.`,
    )
  }
  if ('api' in value && typeof value.api === 'string') {
    Object.assign(endpoints, { api: value.api })
  }
  if ('portal' in value && typeof value.portal === 'string') {
    Object.assign(endpoints, { portal: value.portal })
  }

  return endpoints
}

const normalizeLegacyEndpointValues = (
  value: object,
): StoredConfig['endpoints'] | undefined => {
  if (
    'host' in value &&
    value.host !== undefined &&
    typeof value.host !== 'string'
  ) {
    throw configFormatError('The legacy "host" field must be a string.')
  }
  const endpoints = normalizeEndpointValues(value, 'legacy')
  if (endpoints.api || endpoints.portal) return endpoints
  if ('host' in value && typeof value.host === 'string') {
    return {
      api: value.host,
    }
  }

  return undefined
}

const writeConfig = async (config: StoredConfig): Promise<void> => {
  await ensureConfigDir()
  try {
    await writeFile(configFile(), `${JSON.stringify(config, null, 2)}\n`, {
      mode: 0o600,
    })
  } catch (error) {
    if (isNodeError(error) && (error.code === 'EACCES' || error.code === 'EPERM')) {
      throw configAccessError('write', error)
    }

    throw error
  }
}

const writeNextConfig = async (config: StoredConfig): Promise<StoredConfig> => {
  await writeConfig(config)

  return config
}

const isConfigObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const configFieldPath = (path: 'endpoints' | 'legacy', field: string): string => {
  if (path === 'legacy') return field

  return `${path}.${field}`
}

const configAccessError = (
  action: 'read' | 'write',
  error: NodeJS.ErrnoException,
): Error => {
  return new Error(
    `Cannot ${action} config file ${configFile()}. ${error.message} Check the file permissions.`,
  )
}

const configFormatError = (message: string): Error => {
  return new Error(
    `Invalid config file ${configFile()}: ${message} Fix the file or remove it and run secret config again.`,
  )
}

const isNodeError = (error: unknown): error is NodeJS.ErrnoException => {
  return error instanceof Error && 'code' in error
}
