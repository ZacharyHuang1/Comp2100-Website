ALTER TABLE todo_activity
  ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES app_users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS event_type TEXT NOT NULL DEFAULT 'legacy',
  ADD COLUMN IF NOT EXISTS metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE todo_activity
SET event_type = CASE message
    WHEN 'Task created.' THEN 'task_created'
    WHEN 'Task completed.' THEN 'task_completed'
    WHEN 'Task reopened.' THEN 'task_reopened'
    WHEN 'Task archived.' THEN 'task_archived'
    WHEN 'Subtask added.' THEN 'checklist_item_added'
    WHEN 'Checklist added.' THEN 'checklist_item_added'
    WHEN 'Subtask deleted.' THEN 'checklist_item_deleted'
    ELSE event_type
  END,
  message = CASE message
    WHEN 'Task created.' THEN 'created this task'
    WHEN 'Task completed.' THEN 'completed this task'
    WHEN 'Task reopened.' THEN 'reopened this task'
    WHEN 'Task archived.' THEN 'archived this task'
    WHEN 'Subtask added.' THEN 'added a checklist item'
    WHEN 'Checklist added.' THEN 'added checklist items'
    WHEN 'Subtask deleted.' THEN 'deleted a checklist item'
    ELSE message
  END
WHERE event_type = 'legacy';

CREATE INDEX IF NOT EXISTS idx_todo_activity_task_id_created_at
  ON todo_activity(task_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_todo_activity_event_type
  ON todo_activity(event_type);
