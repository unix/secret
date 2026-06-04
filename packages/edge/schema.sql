CREATE TABLE IF NOT EXISTS secrets (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('text', 'file')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'ready', 'destroyed')),
  text_cipher TEXT,
  r2_key TEXT,
  upload_token TEXT,
  salt TEXT,
  manifest_iv TEXT,
  encrypted_manifest TEXT,
  plain_size INTEGER NOT NULL DEFAULT 0,
  encrypted_size INTEGER NOT NULL DEFAULT 0,
  chunk_size INTEGER,
  chunk_count INTEGER,
  read_limit INTEGER NOT NULL DEFAULT 1,
  track_id TEXT UNIQUE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  completed_at INTEGER,
  destroyed_at INTEGER,
  tracking_expires_at INTEGER
);

CREATE TABLE IF NOT EXISTS secret_reads (
  read_id TEXT PRIMARY KEY,
  secret_id TEXT NOT NULL REFERENCES secrets(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  consumed_at INTEGER
);

CREATE INDEX IF NOT EXISTS secret_reads_secret_id_idx
  ON secret_reads (secret_id, consumed_at);

CREATE INDEX IF NOT EXISTS secrets_expires_at_idx
  ON secrets (expires_at);

CREATE INDEX IF NOT EXISTS secrets_tracking_expires_at_idx
  ON secrets (tracking_expires_at);
