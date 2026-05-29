const explorerService = require('../services/explorerService');

async function getExplorer(req, res, next) {
  try {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    return res.json(await explorerService.getExplorerTree(req.currentUser?.id));
  } catch (error) {
    return next(error);
  }
}

async function getMarks(req, res, next) {
  try {
    return res.json(await explorerService.getMarks(req.currentUser.id));
  } catch (error) {
    return next(error);
  }
}

async function markItem(req, res, next) {
  try {
    return res
      .status(201)
      .json(await explorerService.markItem(req.currentUser.id, req.body || {}));
  } catch (error) {
    return next(error);
  }
}

async function unmarkItem(req, res, next) {
  try {
    return res.json(
      await explorerService.unmarkItem(req.currentUser.id, {
        itemType: req.params.itemType || req.body?.itemType,
        itemId: req.params.itemId || req.body?.itemId,
      })
    );
  } catch (error) {
    return next(error);
  }
}

async function createCategory(req, res, next) {
  try {
    return res.status(201).json(await explorerService.createCategory(req.body));
  } catch (error) {
    return next(error);
  }
}

async function updateCategory(req, res, next) {
  try {
    return res.json(
      await explorerService.updateCategory(req.params.id, req.body)
    );
  } catch (error) {
    return next(error);
  }
}

async function deleteCategory(req, res, next) {
  try {
    return res.json(await explorerService.deleteCategory(req.params.id));
  } catch (error) {
    return next(error);
  }
}

async function createJavaFile(req, res, next) {
  try {
    return res
      .status(201)
      .json(await explorerService.createJavaFile(req.params.categoryId, req.body));
  } catch (error) {
    return next(error);
  }
}

async function getTopicContent(req, res, next) {
  try {
    return res.json(await explorerService.getTopicContent(req.params.id));
  } catch (error) {
    return next(error);
  }
}

async function renameTopic(req, res, next) {
  try {
    return res.json(await explorerService.renameTopic(req.params.id, req.body));
  } catch (error) {
    return next(error);
  }
}

async function deleteTopic(req, res, next) {
  try {
    return res.json(await explorerService.deleteTopic(req.params.id));
  } catch (error) {
    return next(error);
  }
}

async function updateContent(req, res, next) {
  try {
    return res.json(await explorerService.updateContent(req.params.id, req.body));
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createCategory,
  createJavaFile,
  deleteCategory,
  deleteTopic,
  getExplorer,
  getMarks,
  getTopicContent,
  markItem,
  renameTopic,
  unmarkItem,
  updateCategory,
  updateContent,
};
