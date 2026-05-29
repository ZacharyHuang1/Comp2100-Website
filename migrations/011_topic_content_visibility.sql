ALTER TABLE topics
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public';

ALTER TABLE contents
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'topics_visibility_check'
  ) THEN
    ALTER TABLE topics
      ADD CONSTRAINT topics_visibility_check
      CHECK (visibility IN ('public', 'internal'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'contents_visibility_check'
  ) THEN
    ALTER TABLE contents
      ADD CONSTRAINT contents_visibility_check
      CHECK (visibility IN ('public', 'internal'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_topics_visibility
  ON topics(visibility);

CREATE INDEX IF NOT EXISTS idx_contents_visibility
  ON contents(visibility);
