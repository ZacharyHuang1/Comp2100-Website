const documentationRepository = require('../repositories/documentationRepository');
const { createHttpError } = require('./categoryService');
const todoListService = require('./todoListService');
const userService = require('./userService');

const INSTRUCTION_TYPES = new Set([
  'general',
  'setup',
  'workflow',
  'architecture',
  'coding',
  'submission',
  'reminder',
]);
const VISIBILITIES = new Set(['private', 'shared', 'public_to_users']);

function normalizeRequiredText(value, fieldName) {
  const text = typeof value === 'string' ? value.trim() : '';

  if (!text) {
    throw createHttpError(400, `${fieldName} is required`);
  }

  return text;
}

function normalizeOptionalText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeId(value, fieldName) {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw createHttpError(400, `${fieldName} must be a positive integer`);
  }

  return id;
}

function normalizeColor(value, fallback = '#64748B') {
  const color = normalizeOptionalText(value);
  return /^#[0-9a-f]{6}$/i.test(color) ? color : fallback;
}

function normalizeInstructionType(value, fallback = 'general') {
  const instructionType =
    typeof value === 'string' && value.trim() ? value.trim() : fallback;

  if (!INSTRUCTION_TYPES.has(instructionType)) {
    throw createHttpError(400, 'Invalid instruction type');
  }

  return instructionType;
}

function normalizeVisibility(value, fallback = 'private') {
  const visibility =
    typeof value === 'string' && value.trim() ? value.trim() : fallback;

  if (!VISIBILITIES.has(visibility)) {
    throw createHttpError(400, 'Invalid documentation visibility');
  }

  return visibility;
}

function canManageAll(actor) {
  return todoListService.canManageAllTodos(actor);
}

function mapOwner(row) {
  return row.owner_user_id
    ? {
        id: String(row.owner_user_id),
        username: row.owner_username || '',
        displayName: row.owner_display_name || row.owner_username || '',
        email: row.owner_email || '',
        role: row.owner_role || 'user',
        status: row.owner_status || 'active',
        avatarColor: row.owner_avatar_color || '#64748B',
      }
    : null;
}

function mapSpace(row) {
  return {
    id: String(row.id),
    name: row.name,
    description: row.description || '',
    ownerUserId: row.owner_user_id ? String(row.owner_user_id) : '',
    owner: mapOwner(row),
    visibility: row.visibility || 'private',
    markerColor: row.marker_color || '#64748B',
    archived: Boolean(row.archived),
    pageCount: row.page_count ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPage(row) {
  return {
    id: String(row.id),
    spaceId: String(row.space_id),
    spaceName: row.space_name || '',
    spaceMarkerColor: row.space_marker_color || '#64748B',
    title: row.title,
    content: row.content || '',
    instructionType: row.instruction_type || 'general',
    ownerUserId: row.owner_user_id ? String(row.owner_user_id) : '',
    owner: mapOwner(row),
    visibility: row.visibility || 'private',
    archived: Boolean(row.archived),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function assertCanAccessOwner(ownerUserId, actor) {
  if (!canManageAll(actor) && Number(ownerUserId) !== Number(actor?.id)) {
    throw createHttpError(403, 'You do not have permission to access this page.');
  }
}

function isVisibleToActor(row, actor) {
  if (canManageAll(actor)) {
    return true;
  }

  if (Number(row.owner_user_id) === Number(actor?.id)) {
    return true;
  }

  return ['shared', 'public_to_users'].includes(row.visibility);
}

function assertCanRead(row, actor, message) {
  if (!isVisibleToActor(row, actor)) {
    throw createHttpError(404, message);
  }
}

async function getSpaces(filters = {}, actor) {
  const ownerUserId = canManageAll(actor) ? filters.ownerUserId : null;
  const rows = await documentationRepository.getSpaces({
    includeArchived: filters.includeArchived,
    ownerUserId: ownerUserId ? normalizeId(ownerUserId, 'ownerUserId') : null,
  });

  return rows.filter((row) => isVisibleToActor(row, actor)).map(mapSpace);
}

async function getSpace(id, actor) {
  const row = await documentationRepository.getSpaceById(
    normalizeId(id, 'space id')
  );

  if (!row) {
    throw createHttpError(404, 'Documentation space not found');
  }

  assertCanRead(row, actor, 'Documentation space not found');

  return mapSpace(row);
}

async function createSpace(payload, actor) {
  const requestedOwnerId = canManageAll(actor)
    ? payload.ownerUserId || payload.owner_user_id || actor?.id
    : actor?.id;
  const owner = await userService.validateAssignableUser(requestedOwnerId);
  const created = await documentationRepository.createSpace({
    name: normalizeRequiredText(payload.name, 'Space name'),
    description: normalizeOptionalText(payload.description),
    ownerUserId: Number(owner.id),
    visibility: normalizeVisibility(payload.visibility),
    markerColor: normalizeColor(payload.markerColor || payload.marker_color),
  });

  return getSpace(created.id, actor);
}

async function updateSpace(id, payload, actor) {
  const existing = await documentationRepository.getSpaceById(
    normalizeId(id, 'space id')
  );

  if (!existing) {
    throw createHttpError(404, 'Documentation space not found');
  }

  assertCanAccessOwner(existing.owner_user_id, actor);

  const ownerUserId =
    canManageAll(actor) &&
    (payload.ownerUserId !== undefined || payload.owner_user_id !== undefined)
      ? Number(
          (
            await userService.validateAssignableUser(
              payload.ownerUserId || payload.owner_user_id
            )
          ).id
        )
      : undefined;
  const updated = await documentationRepository.updateSpace(existing.id, {
    name:
      payload.name === undefined
        ? undefined
        : normalizeRequiredText(payload.name, 'Space name'),
    description:
      payload.description === undefined
        ? undefined
        : normalizeOptionalText(payload.description),
    ownerUserId,
    visibility:
      payload.visibility === undefined
        ? undefined
        : normalizeVisibility(payload.visibility, existing.visibility || 'private'),
    markerColor:
      payload.markerColor !== undefined || payload.marker_color !== undefined
        ? normalizeColor(payload.markerColor || payload.marker_color)
        : undefined,
    archived:
      typeof payload.archived === 'boolean' ? payload.archived : undefined,
  });

  return getSpace(updated.id, actor);
}

async function archiveSpace(id, actor) {
  return updateSpace(id, { archived: true }, actor);
}

async function deleteSpace(id, actor) {
  const existing = await documentationRepository.getSpaceById(
    normalizeId(id, 'space id')
  );

  if (!existing) {
    throw createHttpError(404, 'Documentation space not found');
  }

  assertCanAccessOwner(existing.owner_user_id, actor);

  const deleted = await documentationRepository.deleteSpace(existing.id);
  return deleted;
}

async function getPages(filters = {}, actor) {
  const ownerUserId = canManageAll(actor) ? filters.ownerUserId : null;
  const rows = await documentationRepository.getPages({
    includeArchived: filters.includeArchived,
    ownerUserId: ownerUserId ? normalizeId(ownerUserId, 'ownerUserId') : null,
    spaceId: filters.spaceId ? normalizeId(filters.spaceId, 'spaceId') : null,
    q: normalizeOptionalText(filters.q),
    instructionType: normalizeOptionalText(filters.instructionType),
  });

  return rows.filter((row) => isVisibleToActor(row, actor)).map(mapPage);
}

async function getPage(id, actor) {
  const row = await documentationRepository.getPageById(
    normalizeId(id, 'page id')
  );

  if (!row) {
    throw createHttpError(404, 'Documentation page not found');
  }

  assertCanRead(row, actor, 'Documentation page not found');

  return mapPage(row);
}

async function createPage(payload, actor) {
  const space = await getSpace(payload.spaceId || payload.space_id, actor);
  const requestedOwnerId = canManageAll(actor)
    ? payload.ownerUserId || payload.owner_user_id || space.ownerUserId || actor?.id
    : actor?.id;
  const owner = await userService.validateAssignableUser(requestedOwnerId);
  const created = await documentationRepository.createPage({
    spaceId: normalizeId(space.id, 'spaceId'),
    title: normalizeRequiredText(payload.title, 'Page title'),
    content: typeof payload.content === 'string' ? payload.content : '',
    instructionType: normalizeInstructionType(
      payload.instructionType || payload.instruction_type
    ),
    ownerUserId: Number(owner.id),
    visibility: normalizeVisibility(payload.visibility),
  });

  return getPage(created.id, actor);
}

async function updatePage(id, payload, actor) {
  const existing = await documentationRepository.getPageById(
    normalizeId(id, 'page id')
  );

  if (!existing) {
    throw createHttpError(404, 'Documentation page not found');
  }

  assertCanAccessOwner(existing.owner_user_id, actor);

  let spaceId;

  if (payload.spaceId !== undefined || payload.space_id !== undefined) {
    const space = await getSpace(payload.spaceId || payload.space_id, actor);
    spaceId = Number(space.id);
  }

  const ownerUserId =
    canManageAll(actor) &&
    (payload.ownerUserId !== undefined || payload.owner_user_id !== undefined)
      ? Number(
          (
            await userService.validateAssignableUser(
              payload.ownerUserId || payload.owner_user_id
            )
          ).id
        )
      : undefined;
  const updated = await documentationRepository.updatePage(existing.id, {
    spaceId,
    title:
      payload.title === undefined
        ? undefined
        : normalizeRequiredText(payload.title, 'Page title'),
    content:
      payload.content === undefined
        ? undefined
        : typeof payload.content === 'string'
          ? payload.content
          : '',
    instructionType:
      payload.instructionType !== undefined || payload.instruction_type !== undefined
        ? normalizeInstructionType(payload.instructionType || payload.instruction_type)
        : undefined,
    ownerUserId,
    visibility:
      payload.visibility === undefined
        ? undefined
        : normalizeVisibility(payload.visibility, existing.visibility || 'private'),
    archived:
      typeof payload.archived === 'boolean' ? payload.archived : undefined,
  });

  return getPage(updated.id, actor);
}

async function archivePage(id, actor) {
  return updatePage(id, { archived: true }, actor);
}

async function deletePage(id, actor) {
  const existing = await documentationRepository.getPageById(
    normalizeId(id, 'page id')
  );

  if (!existing) {
    throw createHttpError(404, 'Documentation page not found');
  }

  assertCanAccessOwner(existing.owner_user_id, actor);

  return documentationRepository.deletePage(existing.id);
}

module.exports = {
  archivePage,
  archiveSpace,
  createPage,
  createSpace,
  deletePage,
  deleteSpace,
  getPage,
  getPages,
  getSpace,
  getSpaces,
  updatePage,
  updateSpace,
};
