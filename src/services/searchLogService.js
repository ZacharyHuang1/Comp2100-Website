const searchLogRepository = require('../repositories/searchLogRepository');
const { createHttpError } = require('./categoryService');

async function recordSearchAttempt(userId, searchQuery, rawQuery = searchQuery) {
  if (!userId) {
    throw createHttpError(400, 'A user identifier is required');
  }

  const existingLog = await searchLogRepository.getSearchLogByUserAndQuery(
    userId,
    searchQuery
  );

  if (!existingLog) {
    try {
      const createdLog = await searchLogRepository.createSearchLog({
        userId,
        searchQuery,
        rawQuery,
      });

      return {
        isFirstSearch: true,
        log: createdLog,
      };
    } catch (error) {
      if (error.code !== '23505') {
        throw error;
      }

      const concurrentLog = await searchLogRepository.getSearchLogByUserAndQuery(
        userId,
        searchQuery
      );

      const updatedConcurrentLog = await searchLogRepository.incrementSearchCount(
        concurrentLog.id,
        rawQuery
      );

      return {
        isFirstSearch: false,
        log: updatedConcurrentLog,
      };
    }
  }

  const updatedLog = await searchLogRepository.incrementSearchCount(
    existingLog.id,
    rawQuery
  );

  return {
    isFirstSearch: false,
    log: updatedLog,
  };
}

async function getSearchLog(userId, searchQuery) {
  if (!userId) {
    throw createHttpError(400, 'A user identifier is required');
  }

  return searchLogRepository.getSearchLogByUserAndQuery(userId, searchQuery);
}

async function createFirstSearchLog(userId, searchQuery, rawQuery = searchQuery) {
  if (!userId) {
    throw createHttpError(400, 'A user identifier is required');
  }

  try {
    const log = await searchLogRepository.createSearchLog({
      userId,
      searchQuery,
      rawQuery,
    });

    return {
      created: true,
      log,
    };
  } catch (error) {
    if (error.code !== '23505') {
      throw error;
    }

    return {
      created: false,
      log: await searchLogRepository.getSearchLogByUserAndQuery(
        userId,
        searchQuery
      ),
    };
  }
}

async function incrementSearchCount(logId, rawQuery) {
  return searchLogRepository.incrementSearchCount(logId, rawQuery);
}

module.exports = {
  recordSearchAttempt,
  getSearchLog,
  createFirstSearchLog,
  incrementSearchCount,
};
