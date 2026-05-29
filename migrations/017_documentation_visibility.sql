ALTER TABLE documentation_spaces
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'private';

ALTER TABLE documentation_pages
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'private';

UPDATE documentation_spaces
SET visibility = 'public_to_users',
    updated_at = NOW()
WHERE lower(name) = lower('Hackathon Guides');

UPDATE documentation_pages
SET visibility = 'public_to_users',
    updated_at = NOW()
WHERE lower(title) = lower('Hackathon Git 使用指南');

CREATE INDEX IF NOT EXISTS idx_documentation_spaces_visibility
  ON documentation_spaces(visibility);

CREATE INDEX IF NOT EXISTS idx_documentation_pages_visibility
  ON documentation_pages(visibility);
