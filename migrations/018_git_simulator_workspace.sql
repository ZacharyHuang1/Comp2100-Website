ALTER TABLE app_users
  ADD COLUMN IF NOT EXISTS accent_color TEXT NOT NULL DEFAULT '#F59E0B';

UPDATE app_users
SET accent_color = COALESCE(NULLIF(accent_color, ''), NULLIF(avatar_color, ''), NULLIF(default_todo_color, ''), '#F59E0B'),
    avatar_color = COALESCE(NULLIF(avatar_color, ''), NULLIF(accent_color, ''), NULLIF(default_todo_color, ''), '#F59E0B')
WHERE accent_color IS NULL
   OR accent_color = ''
   OR avatar_color IS NULL
   OR avatar_color = '';

CREATE TABLE IF NOT EXISTS git_simulator_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Default Git Simulation',
  current_branch TEXT NOT NULL DEFAULT 'main',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS git_simulator_commits (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES git_simulator_sessions(id) ON DELETE CASCADE,
  commit_key TEXT NOT NULL,
  message TEXT NOT NULL,
  branch_name TEXT NOT NULL,
  parent_keys TEXT[] NOT NULL DEFAULT '{}',
  created_by_user_id INTEGER REFERENCES app_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, commit_key)
);

CREATE TABLE IF NOT EXISTS git_simulator_branches (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES git_simulator_sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  commit_key TEXT NOT NULL,
  is_remote BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, name, is_remote)
);

CREATE TABLE IF NOT EXISTS git_simulator_events (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES git_simulator_sessions(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES app_users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  message TEXT NOT NULL,
  snapshot_json JSONB,
  undone_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_git_simulator_sessions_user_id
  ON git_simulator_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_git_simulator_commits_session_id
  ON git_simulator_commits(session_id);

CREATE INDEX IF NOT EXISTS idx_git_simulator_branches_session_id
  ON git_simulator_branches(session_id);

CREATE INDEX IF NOT EXISTS idx_git_simulator_events_session_id_created_at
  ON git_simulator_events(session_id, created_at DESC);
