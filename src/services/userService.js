const userRepository = require('../repositories/userRepository');
const userSessionRepository = require('../repositories/userSessionRepository');
const { createHttpError } = require('./categoryService');
const passwordService = require('./passwordService');

const ROLES = new Set(['user', 'manager', 'root_manager']);
const STATUSES = new Set(['active', 'disabled']);
const ROOT_USERNAME = 'zach';

function isRootManager(user) {
  return user?.username?.toLowerCase() === ROOT_USERNAME || user?.role === 'root_manager';
}

function normalizeUsername(value) {
  const username = typeof value === 'string' ? value.trim().toLowerCase() : '';

  if (!/^[a-z0-9._-]{2,48}$/.test(username)) {
    throw createHttpError(
      400,
      'Username must be 2-48 characters using letters, numbers, dots, underscores, or hyphens.'
    );
  }

  return username;
}

function normalizeRole(value, fallback = 'user') {
  const role = typeof value === 'string' && value.trim() ? value.trim() : fallback;

  if (!ROLES.has(role)) {
    throw createHttpError(400, 'Invalid user role');
  }

  return role;
}

function normalizeStatus(value, fallback = 'active') {
  const status = typeof value === 'string' && value.trim() ? value.trim() : fallback;

  if (!STATUSES.has(status)) {
    throw createHttpError(400, 'Invalid user status');
  }

  return status;
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeColor(value, fallback = '#F59E0B') {
  const color = normalizeString(value);
  return /^#[0-9a-f]{6}$/i.test(color) ? color : fallback;
}

function protectedRootError() {
  throw createHttpError(403, 'Root manager cannot be modified.');
}

function protectedRootDeleteError() {
  throw createHttpError(403, 'Root manager cannot be deleted.');
}

function mapUser(row) {
  return {
    id: String(row.id),
    username: row.username,
    displayName: row.display_name || '',
    email: row.email || '',
    role: row.role,
    status: row.status,
    notes: row.notes || '',
    avatarColor: row.avatar_color || '#d97706',
    accentColor: row.accent_color || row.avatar_color || '#d97706',
    defaultTodoColor: row.default_todo_color || '#F59E0B',
    lastSeenAt: row.last_seen_at,
    lastLoginAt: row.last_login_at,
    passwordSetAt: row.password_set_at,
    hasPassword: Boolean(row.password_hash || row.password_set_at),
    todoListCount: row.todo_list_count ?? 0,
    todoTaskCount: row.todo_task_count ?? 0,
    protected: row.username?.toLowerCase() === ROOT_USERNAME || row.role === 'root_manager',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function ensureRootUser() {
  const existing = await userRepository.getUserByUsername(ROOT_USERNAME);

  if (existing) {
    if (existing.role !== 'root_manager' || existing.status !== 'active') {
      await userRepository.updateUser(existing.id, {
        role: 'root_manager',
        status: 'active',
        displayName: existing.display_name || 'Zach',
      });
    }

    return mapUser(await userRepository.getUserById(existing.id));
  }

  const created = await userRepository.createUser({
    username: ROOT_USERNAME,
    displayName: 'Zach',
    role: 'root_manager',
    status: 'active',
    avatarColor: '#d97706',
  });

  return mapUser(created);
}

async function getRootUser() {
  return ensureRootUser();
}

async function getUsers(filters = {}) {
  await ensureRootUser();
  return (await userRepository.getUsers(filters)).map(mapUser);
}

async function getUser(id) {
  const user = await userRepository.getUserById(Number(id));

  if (!user) {
    throw createHttpError(404, 'User not found');
  }

  return mapUser(user);
}

async function createUser(payload) {
  const role = normalizeRole(payload.role, 'user');

  if (role === 'root_manager') {
    throw createHttpError(403, 'Root manager cannot be modified.');
  }

  const password = normalizeString(payload.password);

  if (!password) {
    throw createHttpError(400, 'Password is required.');
  }

  const passwordHash = await passwordService.hashPassword(password);

  try {
    const created = await userRepository.createUser({
      username: normalizeUsername(payload.username),
      displayName: normalizeString(payload.displayName),
      email: normalizeString(payload.email),
      role,
      status: normalizeStatus(payload.status, 'active'),
      notes: normalizeString(payload.notes),
      avatarColor:
        normalizeColor(payload.accentColor || payload.avatarColor, '#d97706'),
      accentColor:
        normalizeColor(payload.accentColor || payload.avatarColor, '#d97706'),
      defaultTodoColor: normalizeColor(payload.defaultTodoColor, '#F59E0B'),
      passwordHash,
    });

    return getUser(created.id);
  } catch (error) {
    if (error.code === '23505') {
      throw createHttpError(409, 'Username already exists.');
    }

    throw error;
  }
}

async function resetPassword(id, payload, actor) {
  const existing = await userRepository.getUserById(Number(id));

  if (!existing) {
    throw createHttpError(404, 'User not found');
  }

  if (isRootManager(existing) && actor?.role !== 'root_manager') {
    protectedRootError();
  }

  const passwordHash = await passwordService.hashPassword(payload.password);
  const updated = await userRepository.updatePasswordHash(existing.id, passwordHash);
  await userSessionRepository.revokeUserSessions(existing.id);

  return mapUser(updated);
}

async function updateUser(id, payload) {
  const existing = await userRepository.getUserById(Number(id));

  if (!existing) {
    throw createHttpError(404, 'User not found');
  }

  if (isRootManager(existing)) {
    const requestedRole = payload.role === undefined ? existing.role : payload.role;
    const requestedStatus =
      payload.status === undefined ? existing.status : payload.status;

    if (
      requestedRole !== 'root_manager' ||
      requestedStatus !== 'active' ||
      payload.username !== undefined
    ) {
      protectedRootError();
    }
  }

  const role =
    payload.role === undefined
      ? undefined
      : normalizeRole(payload.role, existing.role);

  if (role === 'root_manager' && !isRootManager(existing)) {
    throw createHttpError(403, 'Root manager cannot be modified.');
  }

  const updated = await userRepository.updateUser(existing.id, {
    displayName:
      payload.displayName === undefined
        ? undefined
        : normalizeString(payload.displayName),
    email: payload.email === undefined ? undefined : normalizeString(payload.email),
    role,
    status:
      payload.status === undefined
        ? undefined
        : normalizeStatus(payload.status, existing.status),
    notes: payload.notes === undefined ? undefined : normalizeString(payload.notes),
    avatarColor:
      payload.avatarColor === undefined && payload.accentColor === undefined
        ? undefined
        : normalizeColor(payload.accentColor || payload.avatarColor, existing.avatar_color || '#d97706'),
    accentColor:
      payload.accentColor === undefined && payload.avatarColor === undefined
        ? undefined
        : normalizeColor(payload.accentColor || payload.avatarColor, existing.accent_color || existing.avatar_color || '#d97706'),
    defaultTodoColor:
      payload.defaultTodoColor === undefined
        ? undefined
        : normalizeColor(payload.defaultTodoColor),
  });

  return mapUser(updated);
}

async function deleteUser(id) {
  const existing = await userRepository.getUserById(Number(id));

  if (!existing) {
    throw createHttpError(404, 'User not found');
  }

  if (isRootManager(existing)) {
    protectedRootDeleteError();
  }

  const deleted = await userRepository.deleteUserCascade(existing.id);

  if (!deleted) {
    throw createHttpError(404, 'User not found');
  }

  return {
    deleted: true,
    deletedUserId: String(deleted.deletedUserId),
    username: deleted.username,
    deletedCounts: deleted.deletedCounts,
  };
}

async function grantManager(id) {
  const existing = await userRepository.getUserById(Number(id));

  if (!existing) {
    throw createHttpError(404, 'User not found');
  }

  if (isRootManager(existing)) {
    return mapUser(existing);
  }

  return updateUser(id, { role: 'manager' });
}

async function revokeManager(id) {
  const existing = await userRepository.getUserById(Number(id));

  if (!existing) {
    throw createHttpError(404, 'User not found');
  }

  if (isRootManager(existing)) {
    protectedRootError();
  }

  return updateUser(id, { role: 'user' });
}

async function disableUser(id) {
  const existing = await userRepository.getUserById(Number(id));

  if (!existing) {
    throw createHttpError(404, 'User not found');
  }

  if (isRootManager(existing)) {
    protectedRootError();
  }

  return updateUser(id, { status: 'disabled' });
}

async function enableUser(id) {
  return updateUser(id, { status: 'active' });
}

async function getAssignableUsers() {
  return (await getUsers({ status: 'active' })).filter(
    (user) => user.status === 'active'
  );
}

async function getPublicAssignableUsers() {
  const users = await getAssignableUsers();

  return users.map((user) => ({
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarColor: user.avatarColor,
    accentColor: user.accentColor || user.avatarColor,
    defaultTodoColor: user.defaultTodoColor,
  }));
}

async function validateAssignableUser(id) {
  const userId = Number(id);
  const user = await userRepository.getUserById(userId);

  if (!user) {
    throw createHttpError(404, 'Owner user not found');
  }

  if (user.status !== 'active') {
    throw createHttpError(400, 'Owner user must be active.');
  }

  return mapUser(user);
}

module.exports = {
  createUser,
  deleteUser,
  disableUser,
  enableUser,
  ensureRootUser,
  getAssignableUsers,
  getPublicAssignableUsers,
  getRootUser,
  getUser,
  getUsers,
  grantManager,
  mapUser,
  revokeManager,
  resetPassword,
  updateUser,
  validateAssignableUser,
};
