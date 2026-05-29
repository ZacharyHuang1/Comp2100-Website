const todoListRepository = require('../repositories/todoListRepository');
const userService = require('./userService');
const { createHttpError } = require('./categoryService');

function normalizeName(value) {
  const name = typeof value === 'string' ? value.trim() : '';

  if (!name) {
    throw createHttpError(400, 'List name is required');
  }

  return name;
}

function normalizeColor(value, fallback = '#F59E0B') {
  const color = typeof value === 'string' ? value.trim() : '';
  return /^#[0-9a-f]{6}$/i.test(color) ? color : fallback;
}

function mapList(row) {
  return {
    id: String(row.id),
    name: row.name,
    description: row.description || '',
    color: row.marker_color || row.color || '#F59E0B',
    markerColor: row.marker_color || row.color || '#F59E0B',
    archived: Boolean(row.archived),
    ownerUserId: row.owner_user_id ? String(row.owner_user_id) : '',
    owner: row.owner_user_id
      ? {
          id: String(row.owner_user_id),
          username: row.owner_username || '',
          displayName: row.owner_display_name || row.owner_username || '',
          email: row.owner_email || '',
          role: row.owner_role || 'user',
          status: row.owner_status || 'active',
          avatarColor: row.owner_avatar_color || '#d97706',
        }
      : null,
    taskCount: row.task_count ?? row.taskCount ?? 0,
    doneCount: row.done_count ?? row.doneCount ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function canManageAllTodos(actor) {
  return actor?.role === 'manager' || actor?.role === 'root_manager';
}

function canManageTodo(actor, todoOwnerId) {
  return canManageAllTodos(actor) || Number(todoOwnerId) === Number(actor?.id);
}

function canAccessList(row, actor) {
  return canManageTodo(actor, row.owner_user_id);
}

function assertCanAccessList(row, actor) {
  if (!canAccessList(row, actor)) {
    throw createHttpError(403, 'You do not have permission to access this page.');
  }
}

async function getLists(options = {}, actor = null) {
  const scopedOptions = {
    ...options,
    ownerUserId: canManageAllTodos(actor)
      ? options.ownerUserId
      : Number(actor?.id),
  };
  const rows = await todoListRepository.getLists(scopedOptions);
  return rows.map(mapList);
}

async function getList(id, actor = null) {
  const lists = await todoListRepository.getLists({ includeArchived: true });
  const list = lists.find((currentList) => Number(currentList.id) === Number(id));

  if (!list) {
    throw createHttpError(404, 'List not found');
  }

  assertCanAccessList(list, actor);

  return mapList(list);
}

async function createList(payload, actor = null) {
  const requestedOwnerId = canManageAllTodos(actor)
    ? payload.ownerUserId || payload.owner_user_id || actor?.id
    : actor?.id;
  const owner =
    requestedOwnerId
      ? await userService.validateAssignableUser(requestedOwnerId)
      : await userService.getRootUser();
  const markerColor = normalizeColor(
    payload.markerColor || payload.marker_color || payload.color,
    owner.defaultTodoColor || '#F59E0B'
  );
  const list = await todoListRepository.createList({
    name: normalizeName(payload.name),
    description: typeof payload.description === 'string' ? payload.description.trim() : '',
    color: markerColor,
    markerColor,
    ownerUserId: Number(owner.id),
  });

  return getList(list.id, actor);
}

async function updateList(id, payload, actor = null) {
  const existing = await todoListRepository.getListById(Number(id));

  if (!existing) {
    throw createHttpError(404, 'List not found');
  }

  assertCanAccessList(existing, actor);

  const list = await todoListRepository.updateList(Number(id), {
    name:
      payload.name === undefined
        ? undefined
        : normalizeName(payload.name),
    description:
      typeof payload.description === 'string'
        ? payload.description.trim()
        : undefined,
    color:
      typeof payload.color === 'string' && payload.color.trim()
        ? normalizeColor(payload.color)
        : undefined,
    markerColor:
      payload.markerColor !== undefined || payload.marker_color !== undefined
        ? normalizeColor(payload.markerColor || payload.marker_color)
        : typeof payload.color === 'string' && payload.color.trim()
          ? normalizeColor(payload.color)
          : undefined,
    archived:
      typeof payload.archived === 'boolean' ? payload.archived : undefined,
    ownerUserId:
      canManageAllTodos(actor) &&
      (payload.ownerUserId !== undefined || payload.owner_user_id !== undefined)
        ? Number(
            (
              await userService.validateAssignableUser(
                payload.ownerUserId || payload.owner_user_id
              )
            ).id
          )
        : undefined,
  });

  if (!list) {
    throw createHttpError(404, 'List not found');
  }

  return getList(list.id, actor);
}

async function archiveList(id, actor = null) {
  return updateList(id, { archived: true }, actor);
}

async function deleteList(id, actor = null) {
  const existing = await todoListRepository.getListById(Number(id));

  if (!existing) {
    throw createHttpError(404, 'List not found');
  }

  assertCanAccessList(existing, actor);

  const deleted = await todoListRepository.deleteList(Number(id));

  if (!deleted) {
    throw createHttpError(404, 'List not found');
  }

  return deleted;
}

module.exports = {
  archiveList,
  createList,
  deleteList,
  getList,
  getLists,
  mapList,
  canManageAllTodos,
  canManageTodo,
  assertCanAccessList,
  updateList,
};
