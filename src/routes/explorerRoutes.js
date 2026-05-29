const express = require('express');
const explorerController = require('../controllers/explorerController');
const requireUserAuth = require('../middleware/requireUserAuth');

const router = express.Router();

router.use('/explorer', requireUserAuth);

router.get('/explorer', explorerController.getExplorer);
router.get('/explorer/marks', explorerController.getMarks);
router.post('/explorer/marks', explorerController.markItem);
router.delete('/explorer/marks/:itemType/:itemId', explorerController.unmarkItem);
router.delete('/explorer/marks', explorerController.unmarkItem);
router.post('/explorer/categories', explorerController.createCategory);
router.put('/explorer/categories/:id', explorerController.updateCategory);
router.delete('/explorer/categories/:id', explorerController.deleteCategory);
router.post(
  '/explorer/categories/:categoryId/java-file',
  explorerController.createJavaFile
);
router.get('/explorer/topics/:id/content', explorerController.getTopicContent);
router.put('/explorer/topics/:id', explorerController.renameTopic);
router.delete('/explorer/topics/:id', explorerController.deleteTopic);
router.put('/explorer/contents/:id', explorerController.updateContent);

module.exports = router;
