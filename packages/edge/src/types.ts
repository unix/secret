import type { Context, Hono } from 'hono'

export type Bindings = {
  DB: D1Database
  FILES: R2Bucket
  R2_ACCOUNT_ID?: string
  R2_ACCESS_KEY_ID?: string
  R2_SECRET_ACCESS_KEY?: string
  R2_BUCKET_NAME?: string
}

export type AppEnv = {
  Bindings: Bindings
}

export type App = Hono<AppEnv>

export type AppContext = Context<AppEnv>

export type SecretRecord = {
  id: string
  kind: 'text' | 'file'
  status: 'pending' | 'ready' | 'destroyed'
  text_cipher: string | null
  r2_key: string | null
  upload_token: string | null
  salt: string | null
  manifest_iv: string | null
  encrypted_manifest: string | null
  plain_size: number
  encrypted_size: number
  chunk_size: number | null
  chunk_count: number | null
  read_limit: number
  track_id: string | null
  expires_at: number
  created_at: number
  completed_at: number | null
  destroyed_at: number | null
  tracking_expires_at: number | null
}

export type ReadSecretRow = SecretRecord & {
  read_id: string
  consumed_at: number | null
}

export type StoreTextInput = {
  readonly cipher: string
  readonly plainSize: number
  readonly expiresInSeconds: number
  readonly reads: number
}

export type InitFileInput = {
  readonly encryptedManifest: string
  readonly manifestIv: string
  readonly salt: string
  readonly plainSize: number
  readonly encryptedSize: number
  readonly chunkSize: number
  readonly chunkCount: number
  readonly expiresInSeconds: number
  readonly reads: number
}

export type CompleteFileInput = {
  readonly uploadToken: string
}
