CREATE TABLE IF NOT EXISTS search_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  query TEXT NOT NULL,
  normalized_query TEXT,
  raw_query TEXT,
  search_count INTEGER NOT NULL DEFAULT 1,
  last_not_found_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_search_logs_user_query
  ON search_logs(user_id, query);

CREATE INDEX IF NOT EXISTS idx_search_logs_user_normalized_query
  ON search_logs(user_id, normalized_query);
