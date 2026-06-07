const D1_READ_RETRY_DELAYS_MS = [100, 300, 900, 1800]

const D1_TRANSIENT_ERROR_PARTS = [
  'Network connection lost.',
  'Failed to parse body as JSON',
  'Cannot resolve D1 DB due to transient issue on remote node.',
  'D1 DB reset because its code was updated.',
  'Internal error while starting up D1 DB storage caused object to be reset.',
  'Internal error in D1 DB storage caused object to be reset.',
]

const delay = async (delayMs: number): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, delayMs))
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return value !== null && typeof value === 'object'
}

const errorMessages = (error: unknown): readonly string[] => {
  const messages: string[] = []
  let current = error

  for (let depth = 0; depth < 4; depth += 1) {
    if (current instanceof Error) {
      messages.push(current.message)
      current = current.cause
      continue
    }

    if (!isRecord(current)) {
      break
    }

    if (typeof current.message === 'string') {
      messages.push(current.message)
    }

    current = current.cause
  }

  return messages
}

export const isTransientD1Error = (error: unknown): boolean => {
  const message = errorMessages(error).join('\n')

  return D1_TRANSIENT_ERROR_PARTS.some(part => message.includes(part))
}

export const retryD1Read = async <T>(operation: () => Promise<T>): Promise<T> => {
  let lastError: unknown

  for (let attempt = 0; attempt <= D1_READ_RETRY_DELAYS_MS.length; attempt += 1) {
    if (attempt > 0) {
      await delay(D1_READ_RETRY_DELAYS_MS[attempt - 1])
    }

    try {
      return await operation()
    } catch (error) {
      if (!isTransientD1Error(error)) {
        throw error
      }

      lastError = error
    }
  }

  throw lastError
}
