CREATE TABLE IF NOT EXISTS content_symbols (
  id SERIAL PRIMARY KEY,
  content_id INTEGER NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  visibility TEXT NOT NULL DEFAULT 'package',
  kind TEXT NOT NULL,
  name TEXT NOT NULL,
  signature TEXT NOT NULL,
  snippet TEXT,
  line_number INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_symbols_content_id
  ON content_symbols(content_id);

CREATE INDEX IF NOT EXISTS idx_content_symbols_topic_id
  ON content_symbols(topic_id);

CREATE INDEX IF NOT EXISTS idx_content_symbols_kind
  ON content_symbols(kind);

CREATE INDEX IF NOT EXISTS idx_content_symbols_visibility
  ON content_symbols(visibility);

CREATE INDEX IF NOT EXISTS idx_content_symbols_lower_name
  ON content_symbols(LOWER(name));

CREATE INDEX IF NOT EXISTS idx_content_symbols_lower_signature
  ON content_symbols(LOWER(signature));
