const express = require('express');
const requireUserAuth = require('../middleware/requireUserAuth');
const {
  getCategories,
  createCategory,
  getTopicsByCategory,
  getTopicById,
  createTopic,
} = require('../controllers/topicController');

const router = express.Router();

router.get('/categories', requireUserAuth, getCategories);
router.post('/categories', requireUserAuth, createCategory);
router.get('/categories/:id/topics', requireUserAuth, getTopicsByCategory);
router.get('/topics/:id', requireUserAuth, getTopicById);
router.post('/topics', requireUserAuth, createTopic);

module.exports = router;
