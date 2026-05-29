const { pool, query } = require('../db');

function getCommitSelectSql() {
  return `
    SELECT
      c.id,
      c.session_id,
      c.commit_key,
      c.message,
      c.branch_name,
      c.parent_keys,
      c.created_by_user_id,
      c.created_at,
      u.username AS created_by_username,
      u.display_name AS created_by_display_name,
      COALESCE(u.accent_color, u.avatar_color, '#F59E0B') AS created_by_avatar_color
    FROM git_simulator_commits c
    LEFT JOIN app_users u ON u.id = c.created_by_user_id
  `;
}

function getEventSelectSql() {
  return `
    SELECT
      e.id,
      e.session_id,
      e.user_id,
      e.action,
      e.message,
      e.snapshot_json,
      e.undone_at,
      e.created_at,
      u.username,
      u.display_name,
      COALESCE(u.accent_color, u.avatar_color, '#F59E0B') AS avatar_color
    FROM git_simulator_events e
    LEFT JOIN app_users u ON u.id = e.user_id
  `;
}

async function getSessionByUserId(userId) {
  const result = await query(
    `
      SELECT id, user_id, name, current_branch, created_at, updated_at
      FROM git_simulator_sessions
      WHERE user_id = $1
      LIMIT 1
    `,
    [userId]
  );

  return result.rows[0] || null;
}

async function getSessionById(sessionId) {
  const result = await query(
    `
      SELECT id, user_id, name, current_branch, created_at, updated_at
      FROM git_simulator_sessions
      WHERE id = $1
      LIMIT 1
    `,
    [sessionId]
  );

  return result.rows[0] || null;
}

async function getCommits(sessionId) {
  const result = await query(
    `
      ${getCommitSelectSql()}
      WHERE c.session_id = $1
      ORDER BY c.id ASC
    `,
    [sessionId]
  );

  return result.rows;
}

async function getBranches(sessionId) {
  const result = await query(
    `
      SELECT id, session_id, name, commit_key, is_remote, created_at, updated_at
      FROM git_simulator_branches
      WHERE session_id = $1
      ORDER BY is_remote ASC, CASE WHEN name = 'main' THEN 0 ELSE 1 END, lower(name) ASC
    `,
    [sessionId]
  );

  return result.rows;
}

async function getEvents(sessionId, { limit = 30 } = {}) {
  const result = await query(
    `
      ${getEventSelectSql()}
      WHERE e.session_id = $1
      ORDER BY e.created_at DESC, e.id DESC
      LIMIT $2
    `,
    [sessionId, limit]
  );

  return result.rows;
}

async function transaction(callback) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function createInitialSession(userId) {
  return transaction(async (client) => {
    const sessionResult = await client.query(
      `
        INSERT INTO git_simulator_sessions (user_id, current_branch)
        VALUES ($1, 'main')
        ON CONFLICT (user_id) DO UPDATE
          SET updated_at = git_simulator_sessions.updated_at
        RETURNING id, user_id, name, current_branch, created_at, updated_at
      `,
      [userId]
    );
    const session = sessionResult.rows[0];

    const existingCommits = await client.query(
      'SELECT id FROM git_simulator_commits WHERE session_id = $1 LIMIT 1',
      [session.id]
    );

    if (!existingCommits.rows.length) {
      await client.query(
        `
          INSERT INTO git_simulator_commits (
            session_id,
            commit_key,
            message,
            branch_name,
            parent_keys,
            created_by_user_id
          )
          VALUES ($1, 'c0', 'Initial commit', 'main', '{}', $2)
        `,
        [session.id, userId]
      );
      await client.query(
        `
          INSERT INTO git_simulator_branches (session_id, name, commit_key, is_remote)
          VALUES
            ($1, 'main', 'c0', false),
            ($1, 'main', 'c0', true)
          ON CONFLICT (session_id, name, is_remote) DO NOTHING
        `,
        [session.id]
      );
      await client.query(
        `
          INSERT INTO git_simulator_events (session_id, user_id, action, message)
          VALUES ($1, $2, 'reset', 'Simulation initialized.')
        `,
        [session.id, userId]
      );
    }

    return session;
  });
}

async function getSnapshot(client, sessionId) {
  const sessionResult = await client.query(
    `
      SELECT id, user_id, name, current_branch, created_at, updated_at
      FROM git_simulator_sessions
      WHERE id = $1
    `,
    [sessionId]
  );
  const commitsResult = await client.query(
    `
      SELECT commit_key, message, branch_name, parent_keys, created_by_user_id, created_at
      FROM git_simulator_commits
      WHERE session_id = $1
      ORDER BY id ASC
    `,
    [sessionId]
  );
  const branchesResult = await client.query(
    `
      SELECT name, commit_key, is_remote, created_at, updated_at
      FROM git_simulator_branches
      WHERE session_id = $1
      ORDER BY id ASC
    `,
    [sessionId]
  );

  return {
    session: sessionResult.rows[0],
    commits: commitsResult.rows,
    branches: branchesResult.rows,
  };
}

async function restoreSnapshot(client, sessionId, snapshot) {
  await client.query('DELETE FROM git_simulator_commits WHERE session_id = $1', [
    sessionId,
  ]);
  await client.query('DELETE FROM git_simulator_branches WHERE session_id = $1', [
    sessionId,
  ]);

  await client.query(
    `
      UPDATE git_simulator_sessions
      SET current_branch = $2,
          updated_at = NOW()
      WHERE id = $1
    `,
    [sessionId, snapshot.session.current_branch || 'main']
  );

  for (const commit of snapshot.commits || []) {
    await client.query(
      `
        INSERT INTO git_simulator_commits (
          session_id,
          commit_key,
          message,
          branch_name,
          parent_keys,
          created_by_user_id,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        sessionId,
        commit.commit_key,
        commit.message,
        commit.branch_name,
        commit.parent_keys || [],
        commit.created_by_user_id || null,
        commit.created_at,
      ]
    );
  }

  for (const branch of snapshot.branches || []) {
    await client.query(
      `
        INSERT INTO git_simulator_branches (
          session_id,
          name,
          commit_key,
          is_remote,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        sessionId,
        branch.name,
        branch.commit_key,
        Boolean(branch.is_remote),
        branch.created_at,
        branch.updated_at,
      ]
    );
  }
}

module.exports = {
  createInitialSession,
  getBranches,
  getCommits,
  getEvents,
  getEventSelectSql,
  getSessionById,
  getSessionByUserId,
  getSnapshot,
  restoreSnapshot,
  transaction,
};
