CREATE TABLE IF NOT EXISTS app_users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  avatar_color TEXT,
  last_seen_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT app_users_role_check CHECK (
    role IN ('user', 'manager', 'root_manager')
  ),
  CONSTRAINT app_users_status_check CHECK (
    status IN ('active', 'disabled')
  )
);

INSERT INTO app_users (username, display_name, role, status, avatar_color)
VALUES ('zach', 'Zach', 'root_manager', 'active', '#d97706')
ON CONFLICT (username)
DO UPDATE SET role = 'root_manager',
              status = 'active',
              display_name = COALESCE(app_users.display_name, 'Zach'),
              updated_at = NOW();

ALTER TABLE todo_lists
  ADD COLUMN IF NOT EXISTS owner_user_id INTEGER REFERENCES app_users(id) ON DELETE RESTRICT;

ALTER TABLE todo_tasks
  ADD COLUMN IF NOT EXISTS owner_user_id INTEGER REFERENCES app_users(id) ON DELETE RESTRICT;

UPDATE todo_lists
SET owner_user_id = (SELECT id FROM app_users WHERE username = 'zach')
WHERE owner_user_id IS NULL;

UPDATE todo_tasks
SET owner_user_id = COALESCE(
  (
    SELECT owner_user_id
    FROM todo_lists
    WHERE todo_lists.id = todo_tasks.list_id
  ),
  (SELECT id FROM app_users WHERE username = 'zach')
)
WHERE owner_user_id IS NULL;

ALTER TABLE todo_lists
  ALTER COLUMN owner_user_id SET NOT NULL;

ALTER TABLE todo_tasks
  ALTER COLUMN owner_user_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_todo_lists_owner_user_id ON todo_lists(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_todo_tasks_owner_user_id ON todo_tasks(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_app_users_role ON app_users(role);
CREATE INDEX IF NOT EXISTS idx_app_users_status ON app_users(status);
