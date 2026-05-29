const { query } = require('../db');

function buildTaskWhereClause(filters = {}) {
  const clauses = [];
  const values = [];

  function addClause(sql, value) {
    values.push(value);
    clauses.push(sql.replace('?', `$${values.length}`));
  }

  if (!filters.includeArchived) {
    clauses.push("t.status <> 'archived'");
    clauses.push('t.archived = false');
  }

  if (filters.listId) {
    addClause('t.list_id = ?', filters.listId);
  }

  if (filters.ownerUserId) {
    addClause('t.owner_user_id = ?', filters.ownerUserId);
  }

  if (filters.status) {
    addClause('t.status = ?', filters.status);
  }

  if (filters.priority) {
    const priorities = String(filters.priority)
      .split(',')
      .map((priority) => priority.trim())
      .filter(Boolean);

    if (priorities.length > 1) {
      values.push(priorities);
      clauses.push(`t.priority = ANY($${values.length})`);
    } else {
      addClause('t.priority = ?', priorities[0]);
    }
  }

  if (filters.tag) {
    addClause(
      `EXISTS (
        SELECT 1
        FROM todo_task_tags ttt
        INNER JOIN todo_tags tt ON tt.id = ttt.tag_id
        WHERE ttt.task_id = t.id AND lower(tt.name) = lower(?)
      )`,
      filters.tag
    );
  }

  if (filters.due === 'today') {
    clauses.push("t.due_date >= date_trunc('day', NOW())");
    clauses.push("t.due_date < date_trunc('day', NOW()) + interval '1 day'");
  } else if (filters.due === 'upcoming') {
    clauses.push("t.due_date >= date_trunc('day', NOW())");
    clauses.push("t.due_date < date_trunc('day', NOW()) + interval '14 days'");
  } else if (filters.due === 'overdue') {
    clauses.push("t.due_date < NOW()");
    clauses.push("t.status <> 'done'");
  } else if (filters.due === 'none') {
    clauses.push('t.due_date IS NULL');
  }

  if (filters.q) {
    values.push(filters.q, filters.q, filters.q);
    const titleIndex = values.length - 2;
    const descriptionIndex = values.length - 1;
    const tagIndex = values.length;
    clauses.push(
      `(t.title ILIKE '%' || $${titleIndex} || '%' OR t.description ILIKE '%' || $${descriptionIndex} || '%' OR EXISTS (
        SELECT 1
        FROM todo_task_tags ttt
        INNER JOIN todo_tags tt ON tt.id = ttt.tag_id
        WHERE ttt.task_id = t.id AND tt.name ILIKE '%' || $${tagIndex} || '%'
      ))`
    );
  }

  return {
    whereSql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    values,
  };
}

function getTaskSelectSql() {
  return `
    SELECT
      t.id,
      t.list_id,
      t.title,
      t.description,
      t.status,
      t.priority,
      t.due_date,
      t.completed_at,
      t.sort_order,
      t.linked_topic_id,
      t.linked_category_id,
      t.owner_user_id,
      t.archived,
      t.created_at,
      t.updated_at,
      l.name AS list_name,
      COALESCE(l.marker_color, l.color) AS list_color,
      owner.username AS owner_username,
      owner.display_name AS owner_display_name,
      owner.email AS owner_email,
      owner.role AS owner_role,
      owner.status AS owner_status,
      COALESCE(owner.accent_color, owner.avatar_color, '#d97706') AS owner_avatar_color,
      topic.title AS linked_topic_title,
      topic.slug AS linked_topic_slug,
      category.name AS linked_category_name,
      category.slug AS linked_category_slug,
      COUNT(st.id)::int AS subtask_count,
      COUNT(st.id) FILTER (WHERE st.completed = true)::int AS completed_subtask_count
    FROM todo_tasks t
    LEFT JOIN todo_lists l ON l.id = t.list_id
    INNER JOIN app_users owner ON owner.id = t.owner_user_id
    LEFT JOIN topics topic ON topic.id = t.linked_topic_id
    LEFT JOIN categories category ON category.id = t.linked_category_id
    LEFT JOIN todo_subtasks st ON st.task_id = t.id
  `;
}

async function getTasks(filters = {}) {
  const { whereSql, values } = buildTaskWhereClause(filters);
  const result = await query(
    `
      ${getTaskSelectSql()}
      ${whereSql}
      GROUP BY t.id, l.id, owner.id, topic.id, category.id
      ORDER BY
        CASE t.priority
          WHEN 'urgent' THEN 0
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          ELSE 3
        END ASC,
        t.due_date ASC NULLS LAST,
        t.sort_order ASC,
        t.updated_at DESC
    `,
    values
  );

  return result.rows;
}

async function getTaskById(id) {
  const result = await query(
    `
      ${getTaskSelectSql()}
      WHERE t.id = $1
      GROUP BY t.id, l.id, owner.id, topic.id, category.id
    `,
    [id]
  );

  return result.rows[0] || null;
}

async function createTask(task) {
  const result = await query(
    `
      INSERT INTO todo_tasks (
        list_id,
        title,
        description,
        status,
        priority,
        due_date,
        sort_order,
        owner_user_id,
        linked_topic_id,
        linked_category_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `,
    [
      task.listId,
      task.title,
      task.description || '',
      task.status || 'todo',
      task.priority || 'medium',
      task.dueDate || null,
      task.sortOrder || 0,
      task.ownerUserId,
      task.linkedTopicId || null,
      task.linkedCategoryId || null,
    ]
  );

  return result.rows[0];
}

async function updateTask(id, task) {
  const result = await query(
    `
      UPDATE todo_tasks
      SET list_id = COALESCE($2, list_id),
          title = COALESCE($3, title),
          description = COALESCE($4, description),
          status = COALESCE($5, status),
          priority = COALESCE($6, priority),
          due_date = $7,
          completed_at = CASE
            WHEN COALESCE($5, status) = 'done' AND completed_at IS NULL THEN NOW()
            WHEN COALESCE($5, status) <> 'done' THEN NULL
            ELSE completed_at
          END,
          sort_order = COALESCE($8, sort_order),
          owner_user_id = COALESCE($9, owner_user_id),
          linked_topic_id = $10,
          linked_category_id = $11,
          archived = COALESCE($12, archived),
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [
      id,
      task.listId ?? null,
      task.title ?? null,
      task.description ?? null,
      task.status ?? null,
      task.priority ?? null,
      task.dueDate ?? null,
      task.sortOrder ?? null,
      task.ownerUserId ?? null,
      task.linkedTopicId ?? null,
      task.linkedCategoryId ?? null,
      task.archived ?? null,
    ]
  );

  return result.rows[0] || null;
}

async function deleteTask(id) {
  const result = await query(
    `
      DELETE FROM todo_tasks
      WHERE id = $1
      RETURNING id, title
    `,
    [id]
  );

  return result.rows[0] || null;
}

async function getSubtasksByTaskId(taskId) {
  const result = await query(
    `
      SELECT id, task_id, title, completed, sort_order, created_at, updated_at
      FROM todo_subtasks
      WHERE task_id = $1
      ORDER BY sort_order ASC, id ASC
    `,
    [taskId]
  );

  return result.rows;
}

async function getSubtaskById(id) {
  const result = await query(
    `
      SELECT id, task_id, title, completed, sort_order, created_at, updated_at
      FROM todo_subtasks
      WHERE id = $1
    `,
    [id]
  );

  return result.rows[0] || null;
}

async function createSubtask(taskId, { title, sortOrder }) {
  const result = await query(
    `
      INSERT INTO todo_subtasks (task_id, title, sort_order)
      VALUES ($1, $2, $3)
      RETURNING id, task_id, title, completed, sort_order, created_at, updated_at
    `,
    [taskId, title, sortOrder || 0]
  );

  return result.rows[0];
}

async function updateSubtask(id, { title, completed, sortOrder }) {
  const result = await query(
    `
      UPDATE todo_subtasks
      SET title = COALESCE($2, title),
          completed = COALESCE($3, completed),
          sort_order = COALESCE($4, sort_order),
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, task_id, title, completed, sort_order, created_at, updated_at
    `,
    [id, title ?? null, completed ?? null, sortOrder ?? null]
  );

  return result.rows[0] || null;
}

async function deleteSubtask(id) {
  const result = await query(
    `
      DELETE FROM todo_subtasks
      WHERE id = $1
      RETURNING id, task_id
    `,
    [id]
  );

  return result.rows[0] || null;
}

module.exports = {
  createSubtask,
  createTask,
  deleteSubtask,
  deleteTask,
  getSubtasksByTaskId,
  getSubtaskById,
  getTaskById,
  getTasks,
  updateSubtask,
  updateTask,
};
