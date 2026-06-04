PRAGMA foreign_keys = OFF;

CREATE TABLE secrets_new (
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

INSERT INTO
  secrets_new (
    id,
    kind,
    status,
    text_cipher,
    r2_key,
    upload_token,
    salt,
    manifest_iv,
    encrypted_manifest,
    plain_size,
    encrypted_size,
    chunk_size,
    chunk_count,
    read_limit,
    expires_at,
    created_at,
    completed_at
  )
SELECT
  id,
  kind,
  status,
  text_cipher,
  r2_key,
  upload_token,
  salt,
  manifest_iv,
  encrypted_manifest,
  plain_size,
  encrypted_size,
  chunk_size,
  chunk_count,
  read_limit,
  expires_at,
  created_at,
  completed_at
FROM
  secrets;

DROP TABLE secrets;
ALTER TABLE secrets_new RENAME TO secrets;

CREATE INDEX IF NOT EXISTS secret_reads_secret_id_idx
  ON secret_reads (secret_id, consumed_at);

CREATE INDEX IF NOT EXISTS secrets_expires_at_idx ON secrets (expires_at);

CREATE INDEX IF NOT EXISTS secrets_tracking_expires_at_idx
  ON secrets (tracking_expires_at);

PRAGMA foreign_keys = ON;
