CREATE TABLE IF NOT EXISTS explorer_marks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  item_id INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT explorer_marks_item_type_check CHECK (
    item_type IN ('category', 'topic')
  ),
  UNIQUE(user_id, item_type, item_id)
);

CREATE INDEX IF NOT EXISTS idx_explorer_marks_user_id
  ON explorer_marks(user_id);

CREATE INDEX IF NOT EXISTS idx_explorer_marks_item
  ON explorer_marks(item_type, item_id);
