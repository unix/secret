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
