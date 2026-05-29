const express = require('express');
const todoController = require('../controllers/todoController');
const requireUserAuth = require('../middleware/requireUserAuth');

const router = express.Router();

router.use('/todo', requireUserAuth);

router.get('/todo/users', todoController.getAssignableUsers);

router.get('/todo/lists', todoController.getLists);
router.post('/todo/lists', todoController.createList);
router.get('/todo/lists/:id', todoController.getList);
router.put('/todo/lists/:id', todoController.updateList);
router.delete('/todo/lists/:id', todoController.deleteList);
router.post('/todo/lists/:id/archive', todoController.archiveList);
router.get('/todo/lists/:id/tasks', todoController.getListTasks);

router.get('/todo/tasks', todoController.getTasks);
router.post('/todo/tasks', todoController.createTask);
router.get('/todo/tasks/:id', todoController.getTask);
router.put('/todo/tasks/:id', todoController.updateTask);
router.delete('/todo/tasks/:id', todoController.deleteTask);
router.post('/todo/tasks/:id/complete', todoController.completeTask);
router.post('/todo/tasks/:id/reopen', todoController.reopenTask);
router.post('/todo/tasks/:id/archive', todoController.archiveTask);
router.post('/todo/tasks/:id/move', todoController.moveTask);

router.post('/todo/tasks/:id/subtasks', todoController.createSubtask);
router.put('/todo/subtasks/:id', todoController.updateSubtask);
router.delete('/todo/subtasks/:id', todoController.deleteSubtask);

router.get('/todo/tags', todoController.getTags);
router.post('/todo/tags', todoController.createTag);
router.put('/todo/tags/:id', todoController.updateTag);
router.delete('/todo/tags/:id', todoController.deleteTag);
router.post('/todo/tasks/:id/tags', todoController.addTagToTask);
router.delete('/todo/tasks/:id/tags/:tagId', todoController.removeTagFromTask);

router.get('/todo/tasks/:id/activity', todoController.getActivity);
router.get('/todo/search', todoController.searchTasks);

module.exports = router;
