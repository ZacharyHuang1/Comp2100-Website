const categoryService = require('../services/categoryService');
const topicService = require('../services/topicService');

async function getCategories(_req, res, next) {
  try {
    const categories = await topicService.getAllCategories();
    res.json(categories);
  } catch (error) {
    next(error);
  }
}

async function createCategory(req, res, next) {
  try {
    const category = await categoryService.createCategory(
      req.body.name,
      req.body.parentId
    );
    return res.status(201).json(category);
  } catch (error) {
    return next(error);
  }
}

async function getTopicsByCategory(req, res, next) {
  try {
    const category = await topicService.getTopicsByCategory(req.params.id);

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    return res.json(category);
  } catch (error) {
    return next(error);
  }
}

async function getTopicById(req, res, next) {
  try {
    const topic = await topicService.getTopicById(req.params.id);

    if (!topic) {
      return res.status(404).json({ message: 'Topic not found' });
    }

    return res.json(topic);
  } catch (error) {
    return next(error);
  }
}

async function createTopic(req, res, next) {
  try {
    const topic = await topicService.createTopic(
      req.body.title,
      req.body.categoryId
    );

    return res.status(201).json(topic);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getCategories,
  createCategory,
  getTopicsByCategory,
  getTopicById,
  createTopic,
};
