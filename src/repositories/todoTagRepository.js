const { query } = require('../db');

async function getTags() {
  const result = await query(`
    SELECT id, name, color, created_at, updated_at
    FROM todo_tags
    ORDER BY lower(name) ASC
  `);

  return result.rows;
}

async function createTag({ name, color }) {
  const result = await query(
    `
      INSERT INTO todo_tags (name, color)
      VALUES ($1, $2)
      ON CONFLICT (name)
      DO UPDATE SET color = COALESCE(EXCLUDED.color, todo_tags.color),
                    updated_at = NOW()
      RETURNING id, name, color, created_at, updated_at
    `,
    [name, color || '#d97706']
  );

  return result.rows[0];
}

async function updateTag(id, { name, color }) {
  const result = await query(
    `
      UPDATE todo_tags
      SET name = COALESCE($2, name),
          color = COALESCE($3, color),
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, name, color, created_at, updated_at
    `,
    [id, name ?? null, color ?? null]
  );

  return result.rows[0] || null;
}

async function deleteTag(id) {
  const result = await query(
    `
      DELETE FROM todo_tags
      WHERE id = $1
      RETURNING id, name
    `,
    [id]
  );

  return result.rows[0] || null;
}

async function getTagsByTaskIds(taskIds) {
  if (!taskIds.length) {
    return [];
  }

  const result = await query(
    `
      SELECT ttt.task_id, tt.id, tt.name, tt.color, tt.created_at, tt.updated_at
      FROM todo_task_tags ttt
      INNER JOIN todo_tags tt ON tt.id = ttt.tag_id
      WHERE ttt.task_id = ANY($1::int[])
      ORDER BY lower(tt.name) ASC
    `,
    [taskIds]
  );

  return result.rows;
}

async function addTagToTask(taskId, tagId) {
  const result = await query(
    `
      INSERT INTO todo_task_tags (task_id, tag_id)
      VALUES ($1, $2)
      ON CONFLICT (task_id, tag_id) DO NOTHING
      RETURNING task_id, tag_id
    `,
    [taskId, tagId]
  );

  return result.rows[0] || { task_id: taskId, tag_id: tagId };
}

async function removeTagFromTask(taskId, tagId) {
  const result = await query(
    `
      DELETE FROM todo_task_tags
      WHERE task_id = $1 AND tag_id = $2
      RETURNING task_id, tag_id
    `,
    [taskId, tagId]
  );

  return result.rows[0] || null;
}

async function replaceTaskTags(taskId, tagIds) {
  await query('DELETE FROM todo_task_tags WHERE task_id = $1', [taskId]);

  for (const tagId of tagIds) {
    await addTagToTask(taskId, tagId);
  }
}

module.exports = {
  addTagToTask,
  createTag,
  deleteTag,
  getTags,
  getTagsByTaskIds,
  removeTagFromTask,
  replaceTaskTags,
  updateTag,
};
