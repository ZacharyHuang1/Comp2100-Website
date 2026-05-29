const todoActivityRepository = require('../repositories/todoActivityRepository');
const todoListRepository = require('../repositories/todoListRepository');
const todoTagRepository = require('../repositories/todoTagRepository');
const todoTaskRepository = require('../repositories/todoTaskRepository');
const categoryRepository = require('../repositories/categoryRepository');
const topicRepository = require('../repositories/topicRepository');
const { createHttpError } = require('./categoryService');
const userService = require('./userService');
const todoListService = require('./todoListService');

const STATUSES = new Set(['todo', 'in_progress', 'blocked', 'done', 'archived']);
const PRIORITIES = new Set(['low', 'medium', 'high', 'urgent']);

function normalizeId(value, fieldName) {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw createHttpError(400, `${fieldName} must be a positive integer`);
  }

  return id;
}

function normalizeOptionalId(value, fieldName) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  return normalizeId(value, fieldName);
}

function normalizeTitle(value, fieldName = 'Task title') {
  const title = typeof value === 'string' ? value.trim() : '';

  if (!title) {
    throw createHttpError(400, `${fieldName} is required`);
  }

  return title;
}

function normalizeStatus(value, fallback = 'todo') {
  const status = typeof value === 'string' && value.trim() ? value.trim() : fallback;

  if (!STATUSES.has(status)) {
    throw createHttpError(400, 'Invalid task status');
  }

  return status;
}

function normalizePriority(value, fallback = 'medium') {
  const priority =
    typeof value === 'string' && value.trim() ? value.trim() : fallback;

  if (!PRIORITIES.has(priority)) {
    throw createHttpError(400, 'Invalid task priority');
  }

  return priority;
}

function normalizeDueDate(value, fallback = null) {
  if (value === undefined) {
    return fallback;
  }

  if (value === null || value === '') {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw createHttpError(400, 'Invalid due date');
  }

  return date.toISOString();
}

function mapTag(row) {
  return {
    id: String(row.id),
    name: row.name,
    color: row.color || '#d97706',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSubtask(row) {
  return {
    id: String(row.id),
    taskId: String(row.task_id),
    title: row.title,
    completed: Boolean(row.completed),
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapActivity(row) {
  return {
    id: String(row.id),
    taskId: String(row.task_id),
    userId: row.user_id ? String(row.user_id) : null,
    eventType: row.event_type || 'legacy',
    message: row.message,
    metadata: row.metadata_json || {},
    createdAt: row.created_at,
    user: row.user_id
      ? {
          id: String(row.user_id),
          username: row.username || '',
          displayName: row.display_name || row.username || '',
          avatarColor: row.avatar_color || '#d97706',
        }
      : null,
  };
}

function normalizeComparableDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function datesEqual(left, right) {
  return normalizeComparableDate(left) === normalizeComparableDate(right);
}

function actorId(actor) {
  return actor?.id ? Number(actor.id) : null;
}

async function logActivity(taskId, actor, eventType, message, metadata = {}) {
  return todoActivityRepository.createActivity(taskId, {
    eventType,
    message,
    metadata,
    userId: actorId(actor),
  });
}

function mapTask(row, { tags = [], subtasks = [], activity = [] } = {}) {
  return {
    id: String(row.id),
    listId: row.list_id ? String(row.list_id) : '',
    listName: row.list_name || '',
    listColor: row.list_color || '#d97706',
    title: row.title,
    description: row.description || '',
    status: row.status,
    priority: row.priority,
    dueDate: row.due_date,
    completedAt: row.completed_at,
    sortOrder: row.sort_order,
    linkedTopicId: row.linked_topic_id ? String(row.linked_topic_id) : null,
    linkedCategoryId: row.linked_category_id
      ? String(row.linked_category_id)
      : null,
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
    linkedTopic: row.linked_topic_id
      ? {
          id: String(row.linked_topic_id),
          title: row.linked_topic_title,
          slug: row.linked_topic_slug,
        }
      : null,
    linkedCategory: row.linked_category_id
      ? {
          id: String(row.linked_category_id),
          name: row.linked_category_name,
          slug: row.linked_category_slug,
        }
      : null,
    archived: Boolean(row.archived),
    subtaskCount: row.subtask_count ?? 0,
    completedSubtaskCount: row.completed_subtask_count ?? 0,
    tags,
    subtasks,
    activity,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function attachTags(tasks) {
  const taskIds = tasks.map((task) => Number(task.id));
  const tagRows = await todoTagRepository.getTagsByTaskIds(taskIds);
  const tagsByTaskId = new Map();

  for (const row of tagRows) {
    const taskId = Number(row.task_id);
    const tags = tagsByTaskId.get(taskId) || [];

    tags.push(mapTag(row));
    tagsByTaskId.set(taskId, tags);
  }

  return tasks.map((task) =>
    mapTask(task, { tags: tagsByTaskId.get(Number(task.id)) || [] })
  );
}

async function ensureList(listId) {
  const list = await todoListRepository.getListById(listId);

  if (!list) {
    throw createHttpError(404, 'List not found');
  }

  return list;
}

async function ensureInboxList(owner) {
  const rows = await todoListRepository.getLists({
    includeArchived: false,
    ownerUserId: Number(owner.id),
  });
  const inbox = rows.find((list) => String(list.name || '').toLowerCase() === 'inbox');

  if (inbox) {
    return inbox;
  }

  return todoListRepository.createList({
    name: 'Inbox',
    description: 'Default place for quick tasks.',
    color: owner.defaultTodoColor || '#F59E0B',
    markerColor: owner.defaultTodoColor || '#F59E0B',
    ownerUserId: Number(owner.id),
  });
}

function canManageAllTodos(actor) {
  return todoListService.canManageAllTodos(actor);
}

function assertCanAccessTask(task, actor) {
  if (!todoListService.canManageTodo(actor, task.ownerUserId || task.owner_user_id)) {
    throw createHttpError(403, 'You do not have permission to access this page.');
  }
}

function assertCanUseList(list, actor) {
  if (!todoListService.canManageTodo(actor, list.owner_user_id)) {
    throw createHttpError(403, 'You do not have permission to access this page.');
  }
}

async function ensureLinkedRecords({ linkedTopicId, linkedCategoryId }) {
  if (linkedTopicId) {
    const rows = await topicRepository.getTopicById(linkedTopicId);

    if (!rows.length) {
      throw createHttpError(404, 'Linked topic not found');
    }
  }

  if (linkedCategoryId) {
    const category = await categoryRepository.getCategoryById(linkedCategoryId);

    if (!category) {
      throw createHttpError(404, 'Linked folder not found');
    }
  }
}

async function getTasks(filters = {}, actor = null) {
  const ownerUserId = canManageAllTodos(actor)
    ? filters.ownerUserId
    : actor?.id;
  const rows = await todoTaskRepository.getTasks({
    includeArchived: filters.includeArchived || filters.status === 'archived',
    listId: filters.listId ? normalizeId(filters.listId, 'listId') : null,
    ownerUserId: ownerUserId
      ? normalizeId(ownerUserId, 'ownerUserId')
      : null,
    status: filters.status || null,
    priority: filters.priority || null,
    tag: filters.tag || null,
    due: filters.due || null,
    q: filters.q || null,
  });

  return attachTags(rows);
}

async function getTask(id, actor = null) {
  const taskId = normalizeId(id, 'task id');
  const row = await todoTaskRepository.getTaskById(taskId);

  if (!row) {
    throw createHttpError(404, 'Task not found');
  }

  const [tagRows, subtaskRows, activityRows] = await Promise.all([
    todoTagRepository.getTagsByTaskIds([taskId]),
    todoTaskRepository.getSubtasksByTaskId(taskId),
    todoActivityRepository.getActivityByTaskId(taskId),
  ]);

  const task = mapTask(row, {
    tags: tagRows.map(mapTag),
    subtasks: subtaskRows.map(mapSubtask),
    activity: activityRows.map(mapActivity),
  });

  assertCanAccessTask(task, actor);

  return task;
}

async function createTask(payload, actor = null) {
  const explicitOwnerId = payload.ownerUserId || payload.owner_user_id;

  if (
    !canManageAllTodos(actor) &&
    explicitOwnerId &&
    Number(explicitOwnerId) !== Number(actor?.id)
  ) {
    throw createHttpError(403, 'You do not have permission to assign this task.');
  }

  const requestedOwnerId =
    canManageAllTodos(actor) && explicitOwnerId
      ? explicitOwnerId
      : actor?.id;
  const owner =
    requestedOwnerId
      ? await userService.validateAssignableUser(requestedOwnerId)
      : await userService.getRootUser();
  const listIdFromPayload = payload.listId || payload.list_id;
  const linkedTopicId = normalizeOptionalId(
    payload.linkedTopicId ?? payload.linked_topic_id,
    'linkedTopicId'
  );
  const linkedCategoryId = normalizeOptionalId(
    payload.linkedCategoryId ?? payload.linked_category_id,
    'linkedCategoryId'
  );

  const list = listIdFromPayload
    ? await ensureList(normalizeId(listIdFromPayload, 'listId'))
    : await ensureInboxList(owner);
  const listId = Number(list.id);
  assertCanUseList(list, actor);
  await ensureLinkedRecords({ linkedTopicId, linkedCategoryId });

  const created = await todoTaskRepository.createTask({
    listId,
    title: normalizeTitle(payload.title),
    description:
      typeof payload.description === 'string' ? payload.description.trim() : '',
    status: canManageAllTodos(actor) && payload.status
      ? normalizeStatus(payload.status, 'todo')
      : 'todo',
    priority: canManageAllTodos(actor) && payload.priority
      ? normalizePriority(payload.priority, 'medium')
      : 'medium',
    dueDate: normalizeDueDate(payload.dueDate ?? payload.due_date),
    sortOrder: Number.isInteger(Number(payload.sortOrder))
      ? Number(payload.sortOrder)
      : 0,
    linkedTopicId,
    linkedCategoryId,
    ownerUserId: Number(owner.id),
  });

  await logActivity(created.id, actor, 'task_created', 'created this task');
  if (created.due_date) {
    await logActivity(created.id, actor, 'task_due_set', 'set the due date', {
      newDueAt: normalizeComparableDate(created.due_date),
    });
  }
  await setTaskTags(created.id, canManageAllTodos(actor) ? payload.tags || [] : []);
  await createInitialSubtasks(created.id, payload.subtasks, actor);

  return getTask(created.id, actor);
}

async function createInitialSubtasks(taskId, subtasks, actor = null) {
  if (!Array.isArray(subtasks)) {
    return;
  }

  let sortOrder = 0;

  for (const subtask of subtasks) {
    const rawTitle =
      typeof subtask === 'string'
        ? subtask
        : typeof subtask?.title === 'string'
          ? subtask.title
          : '';
    const title = rawTitle.trim();

    if (!title) {
      continue;
    }

    await todoTaskRepository.createSubtask(taskId, {
      title,
      sortOrder,
    });
    await logActivity(
      taskId,
      actor,
      'checklist_item_added',
      `added checklist item "${title}"`,
      { checklistItemText: title }
    );
    sortOrder += 1;
  }
}

async function updateTask(id, payload, actor = null) {
  const existing = await getTask(id, actor);
  const linkedTopicId =
    payload.linkedTopicId !== undefined || payload.linked_topic_id !== undefined
      ? normalizeOptionalId(
          payload.linkedTopicId ?? payload.linked_topic_id,
          'linkedTopicId'
        )
      : existing.linkedTopicId;
  const linkedCategoryId =
    payload.linkedCategoryId !== undefined ||
    payload.linked_category_id !== undefined
      ? normalizeOptionalId(
          payload.linkedCategoryId ?? payload.linked_category_id,
          'linkedCategoryId'
        )
      : existing.linkedCategoryId;
  const listId =
    payload.listId !== undefined || payload.list_id !== undefined
      ? normalizeId(payload.listId ?? payload.list_id, 'listId')
      : existing.listId;
  const targetList = await ensureList(listId);
  assertCanUseList(targetList, actor);
  const ownerUserId =
    canManageAllTodos(actor) &&
    (payload.ownerUserId !== undefined || payload.owner_user_id !== undefined)
      ? Number(
          (
            await userService.validateAssignableUser(
              payload.ownerUserId ?? payload.owner_user_id
            )
          ).id
        )
      : existing.ownerUserId
        ? Number(existing.ownerUserId)
        : null;
  const hasDueDate =
    Object.prototype.hasOwnProperty.call(payload, 'dueDate') ||
    Object.prototype.hasOwnProperty.call(payload, 'due_date');
  const nextTitle =
    payload.title === undefined ? existing.title : normalizeTitle(payload.title);
  const nextDescription =
    typeof payload.description === 'string'
      ? payload.description
      : existing.description;
  const nextStatus =
    payload.status === undefined
      ? existing.status
      : normalizeStatus(payload.status, existing.status);
  const nextDueDate = hasDueDate
    ? normalizeDueDate(payload.dueDate ?? payload.due_date)
    : existing.dueDate;
  const nextArchived =
    typeof payload.archived === 'boolean' ? payload.archived : existing.archived;

  await ensureLinkedRecords({ linkedTopicId, linkedCategoryId });

  const updated = await todoTaskRepository.updateTask(existing.id, {
    listId,
    title: nextTitle,
    description: nextDescription,
    status: nextStatus,
    priority:
      payload.priority === undefined
        ? existing.priority
        : normalizePriority(payload.priority, existing.priority),
    dueDate: nextDueDate,
    sortOrder:
      payload.sortOrder === undefined
        ? existing.sortOrder
        : Number(payload.sortOrder),
    linkedTopicId,
    linkedCategoryId,
    ownerUserId,
    archived: nextArchived,
  });

  if (!updated) {
    throw createHttpError(404, 'Task not found');
  }

  if (payload.tags) {
    await setTaskTags(existing.id, payload.tags);
  }

  if (nextTitle !== existing.title) {
    await logActivity(
      existing.id,
      actor,
      'task_title_changed',
      `renamed the task from "${existing.title}" to "${nextTitle}"`,
      { oldTitle: existing.title, newTitle: nextTitle }
    );
  }

  if (nextDescription !== existing.description) {
    await logActivity(
      existing.id,
      actor,
      'task_description_changed',
      'changed the description',
      {
        oldDescriptionLength: existing.description.length,
        newDescriptionLength: nextDescription.length,
      }
    );
  }

  if (hasDueDate && !datesEqual(existing.dueDate, nextDueDate)) {
    const oldDueAt = normalizeComparableDate(existing.dueDate);
    const newDueAt = normalizeComparableDate(nextDueDate);
    if (!oldDueAt && newDueAt) {
      await logActivity(existing.id, actor, 'task_due_set', 'set the due date', {
        newDueAt,
      });
    } else if (oldDueAt && !newDueAt) {
      await logActivity(
        existing.id,
        actor,
        'task_due_removed',
        'removed the due date',
        { oldDueAt }
      );
    } else {
      await logActivity(
        existing.id,
        actor,
        'task_due_changed',
        'changed the due date',
        { oldDueAt, newDueAt }
      );
    }
  }

  if (!existing.archived && nextArchived) {
    await logActivity(existing.id, actor, 'task_archived', 'archived this task');
  } else if (existing.archived && !nextArchived) {
    await logActivity(existing.id, actor, 'task_restored', 'restored this task');
  }

  if (existing.status !== 'done' && nextStatus === 'done') {
    await logActivity(existing.id, actor, 'task_completed', 'completed this task');
  } else if (existing.status === 'done' && nextStatus !== 'done') {
    await logActivity(existing.id, actor, 'task_reopened', 'reopened this task');
  }

  return getTask(existing.id, actor);
}

async function deleteTask(id, actor = null) {
  await getTask(id, actor);
  const deleted = await todoTaskRepository.deleteTask(normalizeId(id, 'task id'));

  if (!deleted) {
    throw createHttpError(404, 'Task not found');
  }

  return deleted;
}

async function completeTask(id, actor = null) {
  return updateTask(id, { status: 'done' }, actor);
}

async function reopenTask(id, actor = null) {
  return updateTask(id, { status: 'todo' }, actor);
}

async function archiveTask(id, actor = null) {
  return updateTask(id, { status: 'archived', archived: true }, actor);
}

async function moveTask(id, payload, actor = null) {
  return updateTask(id, {
    listId: payload.listId,
    sortOrder: payload.sortOrder,
  }, actor);
}

async function createSubtask(taskId, payload, actor = null) {
  const task = await getTask(taskId, actor);
  const title = normalizeTitle(payload.title, 'Subtask title');
  const subtask = await todoTaskRepository.createSubtask(task.id, {
    title,
    sortOrder: Number.isInteger(Number(payload.sortOrder))
      ? Number(payload.sortOrder)
      : task.subtaskCount,
  });

  await logActivity(
    task.id,
    actor,
    'checklist_item_added',
    `added checklist item "${title}"`,
    { checklistItemText: title, subtaskId: String(subtask.id) }
  );
  return mapSubtask(subtask);
}

async function updateSubtask(id, payload, actor = null) {
  const existing = await todoTaskRepository.getSubtaskById?.(normalizeId(id, 'subtask id'));
  if (existing) {
    await getTask(existing.task_id, actor);
  }
  const nextTitle =
    payload.title === undefined
      ? undefined
      : normalizeTitle(payload.title, 'Subtask title');
  const nextCompleted =
    typeof payload.completed === 'boolean' ? payload.completed : undefined;
  const subtask = await todoTaskRepository.updateSubtask(normalizeId(id, 'subtask id'), {
    title: nextTitle,
    completed: nextCompleted,
    sortOrder:
      payload.sortOrder === undefined ? undefined : Number(payload.sortOrder),
  });

  if (!subtask) {
    throw createHttpError(404, 'Subtask not found');
  }

  if (existing && nextTitle !== undefined && nextTitle !== existing.title) {
    await logActivity(
      subtask.task_id,
      actor,
      'checklist_item_edited',
      `edited checklist item "${existing.title}"`,
      {
        oldChecklistItemText: existing.title,
        checklistItemText: subtask.title,
        subtaskId: String(subtask.id),
      }
    );
  }

  if (
    existing &&
    nextCompleted !== undefined &&
    nextCompleted !== Boolean(existing.completed)
  ) {
    await logActivity(
      subtask.task_id,
      actor,
      nextCompleted
        ? 'checklist_item_toggled_done'
        : 'checklist_item_toggled_undone',
      nextCompleted
        ? `marked checklist item "${subtask.title}" as done`
        : `marked checklist item "${subtask.title}" as not done`,
      { checklistItemText: subtask.title, subtaskId: String(subtask.id) }
    );
  }

  return mapSubtask(subtask);
}

async function deleteSubtask(id, actor = null) {
  const existing = await todoTaskRepository.getSubtaskById?.(normalizeId(id, 'subtask id'));
  if (existing) {
    await getTask(existing.task_id, actor);
  }
  const subtask = await todoTaskRepository.deleteSubtask(normalizeId(id, 'subtask id'));

  if (!subtask) {
    throw createHttpError(404, 'Subtask not found');
  }

  await logActivity(
    subtask.task_id,
    actor,
    'checklist_item_deleted',
    `deleted checklist item "${existing?.title || 'Checklist item'}"`,
    {
      checklistItemText: existing?.title || '',
      subtaskId: String(subtask.id),
    }
  );
  return subtask;
}

async function getTags() {
  return (await todoTagRepository.getTags()).map(mapTag);
}

async function createTag(payload) {
  return mapTag(
    await todoTagRepository.createTag({
      name: normalizeTitle(payload.name, 'Tag name'),
      color:
        typeof payload.color === 'string' && payload.color.trim()
          ? payload.color.trim()
          : '#d97706',
    })
  );
}

async function updateTag(id, payload) {
  const tag = await todoTagRepository.updateTag(normalizeId(id, 'tag id'), {
    name:
      payload.name === undefined
        ? undefined
        : normalizeTitle(payload.name, 'Tag name'),
    color:
      typeof payload.color === 'string' && payload.color.trim()
        ? payload.color.trim()
        : undefined,
  });

  if (!tag) {
    throw createHttpError(404, 'Tag not found');
  }

  return mapTag(tag);
}

async function deleteTag(id) {
  const deleted = await todoTagRepository.deleteTag(normalizeId(id, 'tag id'));

  if (!deleted) {
    throw createHttpError(404, 'Tag not found');
  }

  return deleted;
}

async function setTaskTags(taskId, tags) {
  if (!Array.isArray(tags)) {
    return;
  }

  const tagIds = [];

  for (const tag of tags) {
    if (typeof tag === 'number' || /^\d+$/.test(String(tag))) {
      tagIds.push(Number(tag));
      continue;
    }

    if (typeof tag === 'string' && tag.trim()) {
      const createdTag = await createTag({ name: tag.trim() });
      tagIds.push(Number(createdTag.id));
    }
  }

  await todoTagRepository.replaceTaskTags(taskId, tagIds);
}

async function addTagToTask(taskId, payload, actor = null) {
  const task = await getTask(taskId, actor);
  const tag =
    payload.tagId || payload.tag_id
      ? { id: normalizeId(payload.tagId || payload.tag_id, 'tagId') }
      : await createTag(payload);

  await todoTagRepository.addTagToTask(task.id, tag.id);
  await logActivity(task.id, actor, 'tag_added', 'added a tag');
  return getTask(task.id, actor);
}

async function removeTagFromTask(taskId, tagId, actor = null) {
  const task = await getTask(taskId, actor);
  await todoTagRepository.removeTagFromTask(
    task.id,
    normalizeId(tagId, 'tagId')
  );
  await logActivity(task.id, actor, 'tag_removed', 'removed a tag');
  return getTask(task.id, actor);
}

async function getActivity(taskId, actor = null) {
  await getTask(taskId, actor);
  return (await todoActivityRepository.getActivityByTaskId(Number(taskId))).map(
    mapActivity
  );
}

module.exports = {
  addTagToTask,
  archiveTask,
  completeTask,
  createSubtask,
  createTag,
  createTask,
  deleteSubtask,
  deleteTag,
  deleteTask,
  getActivity,
  getTags,
  getTask,
  getTasks,
  moveTask,
  removeTagFromTask,
  reopenTask,
  updateSubtask,
  updateTag,
  updateTask,
};
