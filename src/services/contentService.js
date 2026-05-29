const contentRepository = require('../repositories/contentRepository');
const documentationSearchService = require('./documentationSearchService');
const hybridSearchService = require('./hybridSearchService');
const searchLogService = require('./searchLogService');
const symbolIndexService = require('./symbolIndexService');
const topicService = require('./topicService');
const { createHttpError } = require('./categoryService');
const STOPWORDS = new Set(['a', 'the', 'of', 'in', 'to', 'for', 'and']);

function mapSearchResult(row) {
  return {
    id: row.topic_ref_id,
    title: row.topic_title,
    category: {
      id: row.category_ref_id,
      name: row.category_name,
      slug: row.category_slug,
    },
    content: {
      id: row.id,
      query: row.query,
      taskDescription: row.task_description,
      code: row.code,
      explanation: row.explanation,
      complexity: row.complexity,
      uml: row.uml,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
    matches: row.matches || [],
  };
}

function hasAllTokens(value, searchTokens) {
  const normalizedValue = String(value || '').toLowerCase();
  return searchTokens.every((token) => normalizedValue.includes(token));
}

function getSnippet(value, searchTokens, fallbackQuery) {
  const text = String(value || '');
  const lowerText = text.toLowerCase();
  const firstIndex = searchTokens.reduce((bestIndex, token) => {
    const index = lowerText.indexOf(token);

    if (index === -1) {
      return bestIndex;
    }

    return bestIndex === -1 ? index : Math.min(bestIndex, index);
  }, -1);
  const queryIndex = lowerText.indexOf(String(fallbackQuery || '').toLowerCase());
  const matchIndex = queryIndex >= 0 ? queryIndex : firstIndex;

  if (matchIndex === -1) {
    return text.slice(0, 180);
  }

  const start = Math.max(0, matchIndex - 70);
  const end = Math.min(text.length, matchIndex + 140);
  const prefix = start > 0 ? '...' : '';
  const suffix = end < text.length ? '...' : '';

  return `${prefix}${text.slice(start, end).replace(/\s+/g, ' ').trim()}${suffix}`;
}

function getTextMatch(row, searchQuery, searchTokens) {
  if (hasAllTokens(row.task_description, searchTokens)) {
    return {
      type: 'text',
      snippet: getSnippet(row.task_description, searchTokens, searchQuery),
    };
  }

  if (hasAllTokens(row.code, searchTokens)) {
    return {
      type: 'code',
      snippet: getSnippet(row.code, searchTokens, searchQuery),
    };
  }

  if (hasAllTokens(row.explanation, searchTokens)) {
    return {
      type: 'text',
      snippet: getSnippet(row.explanation, searchTokens, searchQuery),
    };
  }

  return null;
}

function getSymbolMatch(row) {
  if (!row.match_symbol_id) {
    return null;
  }

  return {
    type: 'symbol',
    kind: row.match_kind,
    visibility: row.match_visibility,
    name: row.match_name,
    signature: row.match_signature,
    lineNumber: row.match_line_number,
    snippet: row.match_snippet || row.match_signature,
  };
}

function mergeSearchRows(rows, searchQuery, searchTokens) {
  const mergedRows = new Map();

  for (const row of rows) {
    const key = `${row.topic_ref_id}:${row.id}`;
    const existingRow = mergedRows.get(key);
    const nextRow = existingRow || { ...row, matches: [] };
    const match = getSymbolMatch(row) || getTextMatch(row, searchQuery, searchTokens);

    if (match) {
      const matchKey = [
        match.type,
        match.kind || '',
        match.visibility || '',
        match.name || '',
        match.signature || match.snippet || '',
        match.lineNumber || '',
      ].join('|');
      const alreadyIncluded = nextRow.matches.some((existingMatch) => {
        const existingMatchKey = [
          existingMatch.type,
          existingMatch.kind || '',
          existingMatch.visibility || '',
          existingMatch.name || '',
          existingMatch.signature || existingMatch.snippet || '',
          existingMatch.lineNumber || '',
        ].join('|');

        return existingMatchKey === matchKey;
      });

      if (!alreadyIncluded && nextRow.matches.length < 3) {
        nextRow.matches.push(match);
      }
    }

    if (!existingRow) {
      mergedRows.set(key, nextRow);
    }
  }

  return [...mergedRows.values()];
}

async function searchDatabaseContent(normalizedQuery, searchTokens, searchMode) {
  const [symbolRows, contentRows] = await Promise.all([
    contentRepository.searchJavaSymbols(normalizedQuery, searchTokens),
    contentRepository.searchExistingContent(normalizedQuery, searchTokens, searchMode),
  ]);

  return mergeSearchRows(
    [...symbolRows, ...contentRows],
    normalizedQuery,
    searchTokens
  );
}

function formatSearchResponse(source, rows, extraResults = []) {
  const results = [...extraResults, ...rows.map(mapSearchResult)];

  return {
    found: true,
    source,
    data: results[0],
    results,
  };
}

function formatNotFoundResponse() {
  return {
    found: false,
    status: 'not_found',
    message: 'No results found',
  };
}

function formatEmptySearchResponse() {
  return {
    found: true,
    source: 'empty',
    data: null,
    results: [],
  };
}

function formatHybridSearchResponse(results) {
  return {
    found: true,
    source: 'hybrid',
    data: results[0] || null,
    results,
  };
}

function normalizeQuery(searchQuery) {
  if (!searchQuery) {
    return '';
  }

  return searchQuery
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeQuery(searchQuery) {
  const tokens = searchQuery
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => !STOPWORDS.has(token));

  if (!tokens.length && searchQuery.trim()) {
    return [searchQuery.trim()];
  }

  return [...new Set(tokens)];
}

function getSearchMode(searchTokens) {
  return searchTokens.length === 1 ? 'single' : 'multi';
}

async function getContentByQuery(searchQuery, userId, options = {}) {
  const rawQuery = String(searchQuery || '').trim();
  const normalizedQuery = normalizeQuery(rawQuery);

  if (!normalizedQuery) {
    return formatEmptySearchResponse();
  }

  const hybridResults = await hybridSearchService.search(rawQuery, {
    actor: options.actor,
    type: options.type,
    categoryId: options.categoryId,
    topicId: options.topicId,
    language: options.language,
    limit: options.limit,
  });

  if (hybridResults.strongResults.length) {
    return formatHybridSearchResponse(hybridResults.results);
  }

  const searchTokens = tokenizeQuery(normalizedQuery);
  const effectiveSearchTokens = searchTokens.length
    ? searchTokens
    : [normalizedQuery];
  const searchMode = getSearchMode(effectiveSearchTokens);
  const rows = await searchDatabaseContent(
    normalizedQuery,
    effectiveSearchTokens,
    searchMode
  );
  const documentationResults = await documentationSearchService.searchDocumentation(
    rawQuery || normalizedQuery,
    options.actor
  );

  if (documentationResults.length || rows.length) {
    return formatSearchResponse('db', rows, documentationResults);
  }

  await searchLogService.recordSearchAttempt(userId, normalizedQuery, rawQuery);

  return formatNotFoundResponse();
}

async function createContent(content) {
  const normalizedQuery = typeof content.query === 'string' ? content.query.trim() : '';

  if (!normalizedQuery) {
    throw createHttpError(400, 'Content query is required');
  }

  const topic = await topicService.ensureTopicExists({
    topicId: content.topicId,
    topicTitle: content.topicTitle,
    categoryId: content.categoryId,
  });

  try {
    const createdContent = await contentRepository.createContent({
      ...content,
      query: normalizedQuery,
      uml: typeof content.uml === 'string' ? content.uml : '',
      topicId: topic.id,
    });

    await symbolIndexService.indexContent(createdContent);

    return createdContent;
  } catch (error) {
    if (error.code === '23503') {
      throw createHttpError(
        400,
        'Content could not be created because the topic does not exist'
      );
    }

    throw error;
  }
}

module.exports = {
  getContentByQuery,
  createContent,
};
