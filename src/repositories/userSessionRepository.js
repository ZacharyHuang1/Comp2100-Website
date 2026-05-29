const { query } = require('../db');

async function createSession(session) {
  const result = await query(
    `
      INSERT INTO user_sessions (
        user_id,
        token_hash,
        device_label,
        user_agent,
        ip_address,
        expires_at
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, user_id, device_label, user_agent, ip_address, expires_at, revoked_at, created_at, last_seen_at
    `,
    [
      session.userId,
      session.tokenHash,
      session.deviceLabel || '',
      session.userAgent || '',
      session.ipAddress || '',
      session.expiresAt,
    ]
  );

  return result.rows[0];
}

async function getActiveSessionByTokenHash(tokenHash) {
  const result = await query(
    `
      SELECT
        s.id,
        s.user_id,
        s.token_hash,
        s.device_label,
        s.user_agent,
        s.ip_address,
        s.expires_at,
        s.revoked_at,
        s.created_at,
        s.last_seen_at,
        u.username,
        u.display_name,
        u.email,
        u.role,
        u.status,
        COALESCE(u.accent_color, u.avatar_color, '#d97706') AS avatar_color,
        u.accent_color,
        u.default_todo_color,
        u.remember_token_version
      FROM user_sessions s
      INNER JOIN app_users u ON u.id = s.user_id
      WHERE s.token_hash = $1
        AND s.revoked_at IS NULL
        AND s.expires_at > NOW()
      LIMIT 1
    `,
    [tokenHash]
  );

  return result.rows[0] || null;
}

async function updateLastSeen(id) {
  await query('UPDATE user_sessions SET last_seen_at = NOW() WHERE id = $1', [id]);
}

async function revokeSession(id, userId) {
  const values = [id];
  const userClause = userId ? 'AND user_id = $2' : '';

  if (userId) {
    values.push(userId);
  }

  const result = await query(
    `
      UPDATE user_sessions
      SET revoked_at = NOW()
      WHERE id = $1
        ${userClause}
        AND revoked_at IS NULL
      RETURNING id
    `,
    values
  );

  return result.rows[0] || null;
}

async function revokeSessionByTokenHash(tokenHash) {
  const result = await query(
    `
      UPDATE user_sessions
      SET revoked_at = NOW()
      WHERE token_hash = $1
        AND revoked_at IS NULL
      RETURNING id
    `,
    [tokenHash]
  );

  return result.rows[0] || null;
}

async function revokeUserSessions(userId, { exceptSessionId } = {}) {
  const values = [userId];
  let exceptClause = '';

  if (exceptSessionId) {
    values.push(exceptSessionId);
    exceptClause = `AND id <> $${values.length}`;
  }

  await query(
    `
      UPDATE user_sessions
      SET revoked_at = NOW()
      WHERE user_id = $1
        ${exceptClause}
        AND revoked_at IS NULL
    `,
    values
  );
}

async function getActiveSessionsByUserId(userId) {
  const result = await query(
    `
      SELECT id, user_id, device_label, user_agent, ip_address, expires_at, revoked_at, created_at, last_seen_at
      FROM user_sessions
      WHERE user_id = $1
        AND revoked_at IS NULL
        AND expires_at > NOW()
      ORDER BY last_seen_at DESC, created_at DESC
    `,
    [userId]
  );

  return result.rows;
}

module.exports = {
  createSession,
  getActiveSessionByTokenHash,
  getActiveSessionsByUserId,
  revokeSession,
  revokeSessionByTokenHash,
  revokeUserSessions,
  updateLastSeen,
};
