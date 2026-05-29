const { pool, query } = require('../db');

async function getUsers(filters = {}) {
  const values = [];
  const clauses = [];

  if (filters.role) {
    values.push(filters.role);
    clauses.push(`u.role = $${values.length}`);
  }

  if (filters.status) {
    values.push(filters.status);
    clauses.push(`u.status = $${values.length}`);
  }

  if (filters.q) {
    values.push(filters.q);
    const index = values.length;
    clauses.push(
      `(u.username ILIKE '%' || $${index} || '%' OR u.display_name ILIKE '%' || $${index} || '%' OR u.email ILIKE '%' || $${index} || '%')`
    );
  }

  const result = await query(
    `
      SELECT
        u.id,
        u.username,
        u.display_name,
        u.email,
        u.role,
        u.status,
        u.notes,
        COALESCE(u.accent_color, u.avatar_color, '#d97706') AS avatar_color,
        u.accent_color,
        u.default_todo_color,
        u.password_hash,
        u.last_seen_at,
        u.last_login_at,
        u.password_set_at,
        u.created_at,
        u.updated_at,
        COUNT(DISTINCT l.id)::int AS todo_list_count,
        COUNT(DISTINCT t.id)::int AS todo_task_count
      FROM app_users u
      LEFT JOIN todo_lists l ON l.owner_user_id = u.id
      LEFT JOIN todo_tasks t ON t.owner_user_id = u.id
      ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
      GROUP BY u.id
      ORDER BY
        CASE u.role WHEN 'root_manager' THEN 0 WHEN 'manager' THEN 1 ELSE 2 END,
        lower(u.username) ASC
    `,
    values
  );

  return result.rows;
}

async function getUserById(id) {
  const result = await query(
    `
      SELECT
        u.id,
        u.username,
        u.display_name,
        u.email,
        u.role,
        u.status,
        u.notes,
        COALESCE(u.accent_color, u.avatar_color, '#d97706') AS avatar_color,
        u.accent_color,
        u.default_todo_color,
        u.password_hash,
        u.last_seen_at,
        u.last_login_at,
        u.password_set_at,
        u.created_at,
        u.updated_at,
        COUNT(DISTINCT l.id)::int AS todo_list_count,
        COUNT(DISTINCT t.id)::int AS todo_task_count
      FROM app_users u
      LEFT JOIN todo_lists l ON l.owner_user_id = u.id
      LEFT JOIN todo_tasks t ON t.owner_user_id = u.id
      WHERE u.id = $1
      GROUP BY u.id
    `,
    [id]
  );

  return result.rows[0] || null;
}

async function getUserByUsername(username) {
  const result = await query(
    `
      SELECT id, username, display_name, email, role, status, notes, COALESCE(accent_color, avatar_color, '#d97706') AS avatar_color, accent_color, default_todo_color, password_hash, password_set_at, last_login_at, last_seen_at, created_at, updated_at
      FROM app_users
      WHERE lower(username) = lower($1)
      LIMIT 1
    `,
    [username]
  );

  return result.rows[0] || null;
}

async function createUser(user) {
  const result = await query(
    `
      INSERT INTO app_users (username, display_name, email, role, status, notes, avatar_color, accent_color, default_todo_color, password_hash, password_set_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8, $9, CASE WHEN $9::text IS NULL THEN NULL ELSE NOW() END)
      RETURNING id, username, display_name, email, role, status, notes, COALESCE(accent_color, avatar_color, '#d97706') AS avatar_color, accent_color, default_todo_color, password_set_at, last_seen_at, last_login_at, created_at, updated_at
    `,
    [
      user.username,
      user.displayName || '',
      user.email || '',
      user.role || 'user',
      user.status || 'active',
      user.notes || '',
      user.avatarColor || '#d97706',
      user.defaultTodoColor || '#F59E0B',
      user.passwordHash || null,
    ]
  );

  return result.rows[0];
}

async function updateUser(id, user) {
  const result = await query(
    `
      UPDATE app_users
      SET display_name = COALESCE($2, display_name),
          email = COALESCE($3, email),
          role = COALESCE($4, role),
          status = COALESCE($5, status),
          notes = COALESCE($6, notes),
          avatar_color = COALESCE($7, avatar_color),
          default_todo_color = COALESCE($8, default_todo_color),
          accent_color = COALESCE($9, $7, accent_color),
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, username, display_name, email, role, status, notes, COALESCE(accent_color, avatar_color, '#d97706') AS avatar_color, accent_color, default_todo_color, password_set_at, last_login_at, last_seen_at, created_at, updated_at
    `,
    [
      id,
      user.displayName ?? null,
      user.email ?? null,
      user.role ?? null,
      user.status ?? null,
      user.notes ?? null,
      user.avatarColor ?? null,
      user.defaultTodoColor ?? null,
      user.accentColor ?? null,
    ]
  );

  return result.rows[0] || null;
}

async function updatePasswordHash(id, passwordHash) {
  const result = await query(
    `
      UPDATE app_users
      SET password_hash = $2,
          password_set_at = NOW(),
          remember_token_version = remember_token_version + 1,
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, username, display_name, email, role, status, notes, COALESCE(accent_color, avatar_color, '#d97706') AS avatar_color, accent_color, default_todo_color, password_set_at, last_login_at, last_seen_at, created_at, updated_at
    `,
    [id, passwordHash]
  );

  return result.rows[0] || null;
}

async function updateLastLogin(id) {
  await query(
    `
      UPDATE app_users
      SET last_login_at = NOW(),
          last_seen_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
    `,
    [id]
  );
}

async function deleteUser(id) {
  const result = await query(
    `
      DELETE FROM app_users
      WHERE id = $1
      RETURNING id, username
    `,
    [id]
  );

  return result.rows[0] || null;
}

async function deleteUserCascade(id) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query('DELETE FROM user_sessions WHERE user_id = $1', [id]);
    const deletedGitSimulatorSessions = await client.query(
      'DELETE FROM git_simulator_sessions WHERE user_id = $1 RETURNING id',
      [id]
    );

    const deletedDocPages = await client.query(
      'DELETE FROM documentation_pages WHERE owner_user_id = $1 RETURNING id',
      [id]
    );
    const deletedDocSpaces = await client.query(
      'DELETE FROM documentation_spaces WHERE owner_user_id = $1 RETURNING id',
      [id]
    );
    const deletedTodoLists = await client.query(
      'DELETE FROM todo_lists WHERE owner_user_id = $1 RETURNING id',
      [id]
    );
    const deletedTodoTasks = await client.query(
      'DELETE FROM todo_tasks WHERE owner_user_id = $1 RETURNING id',
      [id]
    );
    const deletedUser = await client.query(
      `
        DELETE FROM app_users
        WHERE id = $1
        RETURNING id, username
      `,
      [id]
    );

    await client.query('COMMIT');

    return deletedUser.rows[0]
      ? {
          ...deletedUser.rows[0],
          deleted: true,
          deletedUserId: deletedUser.rows[0].id,
          deletedCounts: {
            documentationPages: deletedDocPages.rowCount,
            documentationSpaces: deletedDocSpaces.rowCount,
            todoLists: deletedTodoLists.rowCount,
            todoTasks: deletedTodoTasks.rowCount,
            gitSimulatorSessions: deletedGitSimulatorSessions.rowCount,
          },
        }
      : null;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function countOwnedTodoItems(id) {
  const result = await query(
    `
      SELECT
        (SELECT COUNT(*)::int FROM todo_lists WHERE owner_user_id = $1) AS list_count,
        (SELECT COUNT(*)::int FROM todo_tasks WHERE owner_user_id = $1) AS task_count
    `,
    [id]
  );

  return result.rows[0] || { list_count: 0, task_count: 0 };
}

async function reassignTodoOwnership(fromUserId, toUserId) {
  await query('UPDATE todo_lists SET owner_user_id = $2, updated_at = NOW() WHERE owner_user_id = $1', [
    fromUserId,
    toUserId,
  ]);
  await query('UPDATE todo_tasks SET owner_user_id = $2, updated_at = NOW() WHERE owner_user_id = $1', [
    fromUserId,
    toUserId,
  ]);
}

module.exports = {
  countOwnedTodoItems,
  createUser,
  deleteUserCascade,
  deleteUser,
  getUserById,
  getUserByUsername,
  getUsers,
  reassignTodoOwnership,
  updateLastLogin,
  updatePasswordHash,
  updateUser,
};
