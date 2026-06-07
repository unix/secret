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

CREATE TABLE IF NOT EXISTS ens_resolutions (
  name TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('resolved', 'unresolved', 'invalid', 'error')),
  address TEXT,
  error TEXT,
  resolved_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS ens_resolutions_resolved_at_idx
  ON ens_resolutions (resolved_at);

CREATE TABLE IF NOT EXISTS secret_evm_policies (
  secret_id TEXT PRIMARY KEY REFERENCES secrets(id) ON DELETE CASCADE,
  chain_id INTEGER NOT NULL,
  address TEXT NOT NULL,
  input TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS secret_evm_reads (
  evm_id TEXT PRIMARY KEY,
  read_id TEXT NOT NULL UNIQUE REFERENCES secret_reads(read_id) ON DELETE CASCADE,
  secret_id TEXT NOT NULL REFERENCES secrets(id) ON DELETE CASCADE,
  chain_id INTEGER NOT NULL,
  address TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS secret_evm_reads_secret_id_idx
  ON secret_evm_reads (secret_id);

CREATE INDEX IF NOT EXISTS secret_evm_reads_expires_at_idx
  ON secret_evm_reads (expires_at);

CREATE TABLE IF NOT EXISTS secret_evm_challenges (
  id TEXT PRIMARY KEY,
  evm_id TEXT NOT NULL REFERENCES secret_evm_reads(evm_id) ON DELETE CASCADE,
  nonce TEXT NOT NULL,
  domain TEXT NOT NULL,
  uri TEXT NOT NULL,
  issued_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  consumed_at INTEGER
);

CREATE INDEX IF NOT EXISTS secret_evm_challenges_evm_id_idx
  ON secret_evm_challenges (evm_id);

CREATE INDEX IF NOT EXISTS secret_evm_challenges_expires_at_idx
  ON secret_evm_challenges (expires_at);
