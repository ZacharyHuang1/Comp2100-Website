const { query } = require('../db');

async function createActivity(
  taskId,
  { eventType = 'legacy', message, metadata = {}, userId = null }
) {
  const result = await query(
    `
      INSERT INTO todo_activity (
        task_id,
        user_id,
        event_type,
        message,
        metadata_json
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, task_id, user_id, event_type, message, metadata_json, created_at
    `,
    [taskId, userId, eventType, message, metadata || {}]
  );

  return result.rows[0];
}

async function getActivityByTaskId(taskId) {
  const result = await query(
    `
      SELECT
        a.id,
        a.task_id,
        a.user_id,
        a.event_type,
        a.message,
        a.metadata_json,
        a.created_at,
        u.username,
        u.display_name,
        COALESCE(u.accent_color, u.avatar_color, '#d97706') AS avatar_color
      FROM todo_activity a
      LEFT JOIN app_users u ON u.id = a.user_id
      WHERE a.task_id = $1
      ORDER BY a.created_at DESC, a.id DESC
    `,
    [taskId]
  );

  return result.rows;
}

module.exports = {
  createActivity,
  getActivityByTaskId,
};
