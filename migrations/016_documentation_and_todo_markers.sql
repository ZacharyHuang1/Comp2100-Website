ALTER TABLE app_users
  ADD COLUMN IF NOT EXISTS default_todo_color TEXT NOT NULL DEFAULT '#F59E0B';

ALTER TABLE todo_lists
  ADD COLUMN IF NOT EXISTS marker_color TEXT NOT NULL DEFAULT '#F59E0B';

UPDATE todo_lists
SET marker_color = COALESCE(NULLIF(marker_color, ''), NULLIF(color, ''), '#F59E0B');

CREATE TABLE IF NOT EXISTS documentation_spaces (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  owner_user_id INTEGER NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  marker_color TEXT NOT NULL DEFAULT '#64748B',
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS documentation_pages (
  id SERIAL PRIMARY KEY,
  space_id INTEGER NOT NULL REFERENCES documentation_spaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  instruction_type TEXT NOT NULL DEFAULT 'general',
  owner_user_id INTEGER NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS documentation_tags (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS documentation_page_tags (
  page_id INTEGER NOT NULL REFERENCES documentation_pages(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES documentation_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (page_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_documentation_spaces_owner_user_id
  ON documentation_spaces(owner_user_id);

CREATE INDEX IF NOT EXISTS idx_documentation_spaces_archived
  ON documentation_spaces(archived);

CREATE INDEX IF NOT EXISTS idx_documentation_pages_space_id
  ON documentation_pages(space_id);

CREATE INDEX IF NOT EXISTS idx_documentation_pages_owner_user_id
  ON documentation_pages(owner_user_id);

CREATE INDEX IF NOT EXISTS idx_documentation_pages_instruction_type
  ON documentation_pages(instruction_type);

CREATE INDEX IF NOT EXISTS idx_documentation_pages_archived
  ON documentation_pages(archived);

CREATE INDEX IF NOT EXISTS idx_documentation_page_tags_page_id
  ON documentation_page_tags(page_id);

CREATE INDEX IF NOT EXISTS idx_documentation_page_tags_tag_id
  ON documentation_page_tags(tag_id);

