type D1Result<T = unknown> = {
  readonly results: T[]
  readonly success: boolean
  readonly meta: {
    readonly changes?: number
  }
}

type D1PreparedStatement = {
  bind(...values: readonly unknown[]): D1PreparedStatement
  first<T = unknown>(): Promise<T | null>
  all<T = unknown>(): Promise<D1Result<T>>
  run(): Promise<D1Result>
}

type D1Database = {
  prepare(query: string): D1PreparedStatement
  batch(statements: readonly D1PreparedStatement[]): Promise<readonly D1Result[]>
}

type R2Bucket = {
  head(key: string): Promise<unknown | null>
  get(key: string): Promise<R2ObjectBody | null>
  delete(key: string): Promise<void>
}

type R2ObjectBody = {
  readonly body: ReadableStream
  readonly size: number
}

type ScheduledEvent = {
  readonly scheduledTime: number
  readonly cron: string
}
