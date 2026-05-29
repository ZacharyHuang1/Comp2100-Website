const todoListService = require('../services/todoListService');
const todoTaskService = require('../services/todoTaskService');
const userService = require('../services/userService');

async function getLists(req, res, next) {
  try {
    res.json(
      await todoListService.getLists(
        {
          includeArchived: req.query.archived === 'true',
          ownerUserId: req.query.ownerUserId,
        },
        req.currentUser
      )
    );
  } catch (error) {
    next(error);
  }
}

async function createList(req, res, next) {
  try {
    res.status(201).json(await todoListService.createList(req.body, req.currentUser));
  } catch (error) {
    next(error);
  }
}

async function getList(req, res, next) {
  try {
    res.json(await todoListService.getList(req.params.id, req.currentUser));
  } catch (error) {
    next(error);
  }
}

async function updateList(req, res, next) {
  try {
    res.json(await todoListService.updateList(req.params.id, req.body, req.currentUser));
  } catch (error) {
    next(error);
  }
}

async function deleteList(req, res, next) {
  try {
    res.json(await todoListService.deleteList(req.params.id, req.currentUser));
  } catch (error) {
    next(error);
  }
}

async function archiveList(req, res, next) {
  try {
    res.json(await todoListService.archiveList(req.params.id, req.currentUser));
  } catch (error) {
    next(error);
  }
}

async function getTasks(req, res, next) {
  try {
    res.json(
      await todoTaskService.getTasks(
        {
          ...req.query,
          includeArchived: req.query.archived === 'true',
        },
        req.currentUser
      )
    );
  } catch (error) {
    next(error);
  }
}

async function getListTasks(req, res, next) {
  try {
    res.json(
      await todoTaskService.getTasks(
        {
          ...req.query,
          listId: req.params.id,
        },
        req.currentUser
      )
    );
  } catch (error) {
    next(error);
  }
}

async function searchTasks(req, res, next) {
  try {
    res.json(
      await todoTaskService.getTasks(
        {
          q: req.query.q || '',
          includeArchived: req.query.archived === 'true',
        },
        req.currentUser
      )
    );
  } catch (error) {
    next(error);
  }
}

async function createTask(req, res, next) {
  try {
    res.status(201).json(await todoTaskService.createTask(req.body, req.currentUser));
  } catch (error) {
    next(error);
  }
}

async function getTask(req, res, next) {
  try {
    res.json(await todoTaskService.getTask(req.params.id, req.currentUser));
  } catch (error) {
    next(error);
  }
}

async function updateTask(req, res, next) {
  try {
    res.json(await todoTaskService.updateTask(req.params.id, req.body, req.currentUser));
  } catch (error) {
    next(error);
  }
}

async function deleteTask(req, res, next) {
  try {
    res.json(await todoTaskService.deleteTask(req.params.id, req.currentUser));
  } catch (error) {
    next(error);
  }
}

async function completeTask(req, res, next) {
  try {
    res.json(await todoTaskService.completeTask(req.params.id, req.currentUser));
  } catch (error) {
    next(error);
  }
}

async function reopenTask(req, res, next) {
  try {
    res.json(await todoTaskService.reopenTask(req.params.id, req.currentUser));
  } catch (error) {
    next(error);
  }
}

async function archiveTask(req, res, next) {
  try {
    res.json(await todoTaskService.archiveTask(req.params.id, req.currentUser));
  } catch (error) {
    next(error);
  }
}

async function moveTask(req, res, next) {
  try {
    res.json(await todoTaskService.moveTask(req.params.id, req.body, req.currentUser));
  } catch (error) {
    next(error);
  }
}

async function createSubtask(req, res, next) {
  try {
    res.status(201).json(
      await todoTaskService.createSubtask(
        req.params.id,
        req.body,
        req.currentUser
      )
    );
  } catch (error) {
    next(error);
  }
}

async function updateSubtask(req, res, next) {
  try {
    res.json(await todoTaskService.updateSubtask(req.params.id, req.body, req.currentUser));
  } catch (error) {
    next(error);
  }
}

async function deleteSubtask(req, res, next) {
  try {
    res.json(await todoTaskService.deleteSubtask(req.params.id, req.currentUser));
  } catch (error) {
    next(error);
  }
}

async function getTags(_req, res, next) {
  try {
    res.json(await todoTaskService.getTags());
  } catch (error) {
    next(error);
  }
}

async function createTag(req, res, next) {
  try {
    res.status(201).json(await todoTaskService.createTag(req.body));
  } catch (error) {
    next(error);
  }
}

async function updateTag(req, res, next) {
  try {
    res.json(await todoTaskService.updateTag(req.params.id, req.body));
  } catch (error) {
    next(error);
  }
}

async function deleteTag(req, res, next) {
  try {
    res.json(await todoTaskService.deleteTag(req.params.id));
  } catch (error) {
    next(error);
  }
}

async function addTagToTask(req, res, next) {
  try {
    res.json(await todoTaskService.addTagToTask(req.params.id, req.body, req.currentUser));
  } catch (error) {
    next(error);
  }
}

async function removeTagFromTask(req, res, next) {
  try {
    res.json(
      await todoTaskService.removeTagFromTask(
        req.params.id,
        req.params.tagId,
        req.currentUser
      )
    );
  } catch (error) {
    next(error);
  }
}

async function getActivity(req, res, next) {
  try {
    res.json(await todoTaskService.getActivity(req.params.id, req.currentUser));
  } catch (error) {
    next(error);
  }
}

async function getAssignableUsers(req, res, next) {
  try {
    if (
      req.currentUser?.role === 'manager' ||
      req.currentUser?.role === 'root_manager'
    ) {
      return res.json(await userService.getPublicAssignableUsers());
    }

    return res.json([
      {
        id: req.currentUser.id,
        username: req.currentUser.username,
        displayName: req.currentUser.displayName,
        avatarColor: req.currentUser.avatarColor,
      },
    ]);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  addTagToTask,
  archiveList,
  archiveTask,
  completeTask,
  createList,
  createSubtask,
  createTag,
  createTask,
  deleteList,
  deleteSubtask,
  deleteTag,
  deleteTask,
  getAssignableUsers,
  getActivity,
  getList,
  getListTasks,
  getLists,
  getTags,
  getTask,
  getTasks,
  moveTask,
  removeTagFromTask,
  reopenTask,
  searchTasks,
  updateList,
  updateSubtask,
  updateTag,
  updateTask,
};
