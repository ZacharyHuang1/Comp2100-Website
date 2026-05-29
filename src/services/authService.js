const crypto = require('crypto');
const env = require('../config/env');
const userRepository = require('../repositories/userRepository');
const userSessionRepository = require('../repositories/userSessionRepository');
const { createHttpError } = require('./categoryService');
const passwordService = require('./passwordService');
const userService = require('./userService');

const COOKIE_NAME = 'kb_session';
const SHORT_SESSION_MS = 1000 * 60 * 60 * 12;
const REMEMBER_SESSION_MS = 1000 * 60 * 60 * 24 * 30;

function parseCookies(cookieHeader) {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader.split(';').reduce((cookies, cookiePair) => {
    const [rawName, ...rawValueParts] = cookiePair.trim().split('=');

    if (!rawName) {
      return cookies;
    }

    cookies[rawName] = decodeURIComponent(rawValueParts.join('=') || '');
    return cookies;
  }, {});
}

function hashSessionToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function getSessionToken(req) {
  return parseCookies(req.headers.cookie)[COOKIE_NAME] || '';
}

function getClientIp(req) {
  const forwardedFor = req.headers['x-forwarded-for'];

  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }

  return req.socket?.remoteAddress || '';
}

function getDeviceLabel(userAgent) {
  if (!userAgent) {
    return 'Current device';
  }

  if (/chrome|safari|firefox|edge/i.test(userAgent)) {
    return userAgent.split(' ').slice(0, 3).join(' ');
  }

  return userAgent.slice(0, 80);
}

function mapSession(row, currentSessionId) {
  return {
    id: String(row.id),
    deviceLabel: row.device_label || 'Current device',
    userAgent: row.user_agent || '',
    ipAddress: row.ip_address || '',
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at,
    current: currentSessionId ? Number(row.id) === Number(currentSessionId) : false,
  };
}

function sanitizeUser(row) {
  if (!row) {
    return null;
  }

  return {
    id: String(row.id),
    username: row.username,
    displayName: row.display_name || row.displayName || row.username,
    email: row.email || '',
    role: row.role,
    status: row.status,
    avatarColor: row.avatar_color || row.avatarColor || '#d97706',
    accentColor: row.accent_color || row.accentColor || row.avatar_color || row.avatarColor || '#d97706',
    defaultTodoColor: row.default_todo_color || row.defaultTodoColor || '#F59E0B',
  };
}

function setSessionCookie(res, token, maxAge) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.nodeEnv === 'production',
    maxAge,
    path: '/',
  });
}

function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.nodeEnv === 'production',
    path: '/',
  });
}

async function getSessionFromRequest(req) {
  const token = getSessionToken(req);

  if (!token) {
    return null;
  }

  const session = await userSessionRepository.getActiveSessionByTokenHash(
    hashSessionToken(token)
  );

  if (!session || session.status !== 'active') {
    return null;
  }

  await userSessionRepository.updateLastSeen(session.id);

  return {
    id: String(session.id),
    user: sanitizeUser({
      id: session.user_id,
      username: session.username,
      display_name: session.display_name,
      email: session.email,
      role: session.role,
      status: session.status,
      avatar_color: session.avatar_color,
      accent_color: session.accent_color,
      default_todo_color: session.default_todo_color,
    }),
  };
}

async function createSessionForUser({ user, rememberDevice, req, res }) {
  const token = crypto.randomBytes(32).toString('base64url');
  const maxAge = rememberDevice ? REMEMBER_SESSION_MS : SHORT_SESSION_MS;
  const expiresAt = new Date(Date.now() + maxAge).toISOString();
  const userAgent = req.headers['user-agent'] || '';

  await userSessionRepository.createSession({
    userId: user.id,
    tokenHash: hashSessionToken(token),
    deviceLabel: getDeviceLabel(userAgent),
    userAgent,
    ipAddress: getClientIp(req),
    expiresAt,
  });

  setSessionCookie(res, token, maxAge);
}

async function login({ username, password, rememberDevice, req, res }) {
  if (
    typeof username === 'string' &&
    username.trim().toLowerCase() === env.adminUsername.toLowerCase()
  ) {
    await ensureRootPassword();
  }

  const user = await userRepository.getUserByUsername(username);

  if (!user || !user.password_hash) {
    throw createHttpError(401, 'Invalid username or password.');
  }

  if (user.status !== 'active') {
    throw createHttpError(403, 'Account is disabled.');
  }

  const passwordMatches = await passwordService.verifyPassword(
    password,
    user.password_hash
  );

  if (!passwordMatches) {
    throw createHttpError(401, 'Invalid username or password.');
  }

  await userRepository.updateLastLogin(user.id);
  await createSessionForUser({ user, rememberDevice, req, res });

  return sanitizeUser(user);
}

async function logout(req, res) {
  const token = getSessionToken(req);

  if (token) {
    await userSessionRepository.revokeSessionByTokenHash(hashSessionToken(token));
  }

  clearSessionCookie(res);
}

async function changePassword({ req, user, currentPassword, newPassword }) {
  const dbUser = await userRepository.getUserById(Number(user.id));

  if (!dbUser?.password_hash) {
    throw createHttpError(400, 'Current password is not set.');
  }

  const passwordMatches = await passwordService.verifyPassword(
    currentPassword,
    dbUser.password_hash
  );

  if (!passwordMatches) {
    throw createHttpError(401, 'Invalid username or password.');
  }

  const passwordHash = await passwordService.hashPassword(newPassword);
  await userRepository.updatePasswordHash(dbUser.id, passwordHash);

  const session = await getSessionFromRequest(req);
  await userSessionRepository.revokeUserSessions(dbUser.id, {
    exceptSessionId: session?.id,
  });
}

async function getSessionsForUser(user, currentSessionId) {
  const sessions = await userSessionRepository.getActiveSessionsByUserId(
    Number(user.id)
  );

  return sessions.map((session) => mapSession(session, currentSessionId));
}

async function revokeOwnSession({ user, sessionId }) {
  const revoked = await userSessionRepository.revokeSession(
    Number(sessionId),
    Number(user.id)
  );

  if (!revoked) {
    throw createHttpError(404, 'Session not found');
  }

  return { success: true };
}

async function ensureRootPassword() {
  const rootUser = await userService.getRootUser();
  const dbUser = await userRepository.getUserById(Number(rootUser.id));

  if (dbUser?.password_hash) {
    return rootUser;
  }

  const passwordHash = await passwordService.hashPassword(env.adminPassword, {
    allowLegacyShort: true,
  });
  await userRepository.updatePasswordHash(rootUser.id, passwordHash);

  return userService.getRootUser();
}

module.exports = {
  COOKIE_NAME,
  changePassword,
  clearSessionCookie,
  createSessionForUser,
  ensureRootPassword,
  getSessionFromRequest,
  getSessionsForUser,
  login,
  logout,
  revokeOwnSession,
  sanitizeUser,
};
