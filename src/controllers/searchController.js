const crypto = require('crypto');
const contentService = require('../services/contentService');
const logService = require('../services/logService');
const markdownService = require('../services/markdownService');

function getUserIdentifier(req) {
  if (req.currentUser?.id) {
    return `user:${req.currentUser.id}`;
  }

  const headerUserId = req.get('x-user-id');

  if (headerUserId && headerUserId.trim()) {
    return headerUserId.trim();
  }

  if (req.ip) {
    return `ip:${req.ip}`;
  }

  return `temp:${crypto.randomUUID()}`;
}

async function searchContent(req, res, next) {
  try {
    const userId = getUserIdentifier(req);
    const result = await contentService.getContentByQuery(
      req.query.q,
      userId,
      {
        actor: req.currentUser,
        type: req.query.type,
        categoryId: req.query.categoryId,
        topicId: req.query.topicId,
        language: req.query.language,
        limit: req.query.limit,
      }
    );

    await Promise.allSettled([
      markdownService.writeSearchResultsToFiles(result),
      logService.appendSearchLog(userId, req.query.q, result),
    ]);

    res.json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  searchContent,
};
