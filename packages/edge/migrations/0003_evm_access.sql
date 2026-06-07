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
