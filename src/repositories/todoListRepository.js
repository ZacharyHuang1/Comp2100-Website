const { query } = require('../db');

async function getLists({ includeArchived = false, ownerUserId = null } = {}) {
  const values = [Boolean(includeArchived)];
  const ownerClause = ownerUserId ? 'AND l.owner_user_id = $2' : '';

  if (ownerUserId) {
    values.push(ownerUserId);
  }

  const result = await query(
    `
      SELECT
        l.id,
        l.name,
        l.description,
        l.color,
        l.marker_color,
        l.archived,
        l.owner_user_id,
        u.username AS owner_username,
        u.display_name AS owner_display_name,
        u.email AS owner_email,
        u.role AS owner_role,
        u.status AS owner_status,
        COALESCE(u.accent_color, u.avatar_color, '#d97706') AS owner_avatar_color,
        l.created_at,
        l.updated_at,
        COUNT(t.id) FILTER (WHERE t.status <> 'archived' AND t.archived = false)::int AS task_count,
        COUNT(t.id) FILTER (WHERE t.status = 'done' AND t.archived = false)::int AS done_count
      FROM todo_lists l
      INNER JOIN app_users u ON u.id = l.owner_user_id
      LEFT JOIN todo_tasks t ON t.list_id = l.id
      WHERE ($1::boolean = true OR l.archived = false)
        ${ownerClause}
      GROUP BY l.id, u.id
      ORDER BY l.archived ASC, l.updated_at DESC, lower(l.name) ASC
    `,
    values
  );

  return result.rows;
}

async function getListById(id) {
  const result = await query(
    `
      SELECT
        l.id,
        l.name,
        l.description,
        l.color,
        l.marker_color,
        l.archived,
        l.owner_user_id,
        u.username AS owner_username,
        u.display_name AS owner_display_name,
        u.email AS owner_email,
        u.role AS owner_role,
        u.status AS owner_status,
        COALESCE(u.accent_color, u.avatar_color, '#d97706') AS owner_avatar_color,
        l.created_at,
        l.updated_at
      FROM todo_lists l
      INNER JOIN app_users u ON u.id = l.owner_user_id
      WHERE l.id = $1
    `,
    [id]
  );

  return result.rows[0] || null;
}

async function createList({ name, description, color, markerColor, ownerUserId }) {
  const result = await query(
    `
      INSERT INTO todo_lists (name, description, color, marker_color, owner_user_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, description, color, marker_color, archived, owner_user_id, created_at, updated_at
    `,
    [
      name,
      description || '',
      color || markerColor || '#F59E0B',
      markerColor || color || '#F59E0B',
      ownerUserId,
    ]
  );

  return result.rows[0];
}

async function updateList(
  id,
  { name, description, color, markerColor, archived, ownerUserId }
) {
  const result = await query(
    `
      UPDATE todo_lists
      SET name = COALESCE($2, name),
          description = COALESCE($3, description),
          color = COALESCE($4, color),
          marker_color = COALESCE($5, marker_color),
          archived = COALESCE($6, archived),
          owner_user_id = COALESCE($7, owner_user_id),
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, name, description, color, marker_color, archived, owner_user_id, created_at, updated_at
    `,
    [
      id,
      name ?? null,
      description ?? null,
      color ?? null,
      markerColor ?? null,
      archived ?? null,
      ownerUserId ?? null,
    ]
  );

  return result.rows[0] || null;
}

async function deleteList(id) {
  const result = await query(
    `
      DELETE FROM todo_lists
      WHERE id = $1
      RETURNING id, name
    `,
    [id]
  );

  return result.rows[0] || null;
}

module.exports = {
  createList,
  deleteList,
  getListById,
  getLists,
  updateList,
};
