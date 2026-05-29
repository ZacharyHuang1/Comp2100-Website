CREATE TABLE IF NOT EXISTS todo_lists (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS todo_tasks (
  id SERIAL PRIMARY KEY,
  list_id INTEGER REFERENCES todo_lists(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo',
  priority TEXT NOT NULL DEFAULT 'medium',
  due_date TIMESTAMPTZ NULL,
  completed_at TIMESTAMPTZ NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  linked_topic_id INTEGER NULL REFERENCES topics(id) ON DELETE SET NULL,
  linked_category_id INTEGER NULL REFERENCES categories(id) ON DELETE SET NULL,
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT todo_tasks_status_check CHECK (
    status IN ('todo', 'in_progress', 'blocked', 'done', 'archived')
  ),
  CONSTRAINT todo_tasks_priority_check CHECK (
    priority IN ('low', 'medium', 'high', 'urgent')
  )
);

CREATE TABLE IF NOT EXISTS todo_subtasks (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES todo_tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS todo_tags (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS todo_task_tags (
  task_id INTEGER NOT NULL REFERENCES todo_tasks(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES todo_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, tag_id)
);

CREATE TABLE IF NOT EXISTS todo_activity (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES todo_tasks(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_todo_tasks_list_id ON todo_tasks(list_id);
CREATE INDEX IF NOT EXISTS idx_todo_tasks_status ON todo_tasks(status);
CREATE INDEX IF NOT EXISTS idx_todo_tasks_priority ON todo_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_todo_tasks_due_date ON todo_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_todo_tasks_linked_topic_id ON todo_tasks(linked_topic_id);
CREATE INDEX IF NOT EXISTS idx_todo_task_tags_task_id ON todo_task_tags(task_id);
CREATE INDEX IF NOT EXISTS idx_todo_task_tags_tag_id ON todo_task_tags(tag_id);

INSERT INTO todo_lists (name, description, color)
SELECT 'Inbox', 'Default place for quick tasks.', '#d97706'
WHERE NOT EXISTS (
  SELECT 1 FROM todo_lists WHERE lower(name) = 'inbox'
);

INSERT INTO todo_lists (name, description, color)
SELECT 'Study Plan', 'Track reading, review, and implementation practice.', '#57534e'
WHERE NOT EXISTS (
  SELECT 1 FROM todo_lists WHERE lower(name) = 'study plan'
);

INSERT INTO todo_lists (name, description, color)
SELECT 'Hackathon Practice', 'Organise mock hackathon preparation work.', '#92400e'
WHERE NOT EXISTS (
  SELECT 1 FROM todo_lists WHERE lower(name) = 'hackathon practice'
);
