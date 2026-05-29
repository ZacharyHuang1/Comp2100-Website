CREATE TABLE IF NOT EXISTS content_variants (
  id BIGSERIAL PRIMARY KEY,
  topic_id BIGINT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  parent_content_id BIGINT REFERENCES contents(id) ON DELETE SET NULL,
  label TEXT NOT NULL,
  instruction TEXT,
  code TEXT,
  explanation TEXT,
  complexity TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_variants_topic_id
  ON content_variants(topic_id);

CREATE INDEX IF NOT EXISTS idx_content_variants_parent_content_id
  ON content_variants(parent_content_id);
