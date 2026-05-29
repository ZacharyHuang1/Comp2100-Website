const searchDocumentRepository = require('../repositories/searchDocumentRepository');
const { createEmbedding } = require('./embeddingService');

const UNAVAILABLE_DATABASE_CODES = new Set(['42P01', '42704', '42883']);

function isCodeLikeQuery(query) {
  const value = String(query || '').trim();

  if (!value) {
    return false;
  }

  return [
    /[a-z][A-Z][A-Za-z0-9]*/, // camelCase
    /\b[A-Z][a-z0-9]+(?:[A-Z][A-Za-z0-9]*)+\b/, // PascalCase
    /\b[A-Za-z]+_[A-Za-z0-9_]+\b/, // snake_case
    /\.(java|ts|tsx|js|jsx|sql|xml|json|css|html|md)\b/i,
    /\b[A-Za-z_$][\w$]*\s*\(/,
    /\b[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*){2,}\b/,
    /\bR\.id\.[A-Za-z_$][\w$]*\b/,
    /\b(error|exception|stack trace|failed|cannot|undefined|null pointer|mismatch)\b/i,
    /\b[A-Z]{2,}\d{3,}\b/,
    /\btask\s*\d+\b/i,
    /\bweek[-\s]?\d+\b/i,
  ].some((pattern) => pattern.test(value));
}

function normalizeType(value) {
  const normalized = String(value || 'all').trim().toLowerCase();

  if (['code', 'docs', 'doc', 'tasks', 'task', 'topics', 'topic', 'all'].includes(normalized)) {
    return normalized;
  }

  return 'all';
}

function normalizePositiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function getMatchPreview(row) {
  if (row.content_preview) {
    return row.content_preview;
  }

  if (row.metadata?.heading) {
    return row.metadata.heading;
  }

  return row.title;
}

function getResultHref(row) {
  if (row.source_type === 'task') {
    return row.path || `/todo/task/${row.metadata?.task_id || row.source_id.replace(/^task:/, '')}`;
  }

  if (row.source_type === 'category') {
    return `/category/${row.category_id}`;
  }

  if (row.metadata?.domain === 'documentation') {
    return row.path || `/documentation/doc/${row.metadata.document_id}`;
  }

  if (row.topic_id) {
    return `/topic/${row.topic_id}`;
  }

  return row.path || '/search';
}

function getCategory(row) {
  if (row.category_id) {
    return {
      id: String(row.category_id),
      name: row.category_name || 'Knowledge Base',
      slug: row.category_slug || null,
    };
  }

  if (row.source_type === 'task') {
    return {
      id: 'tasks',
      name: 'Tasks',
      slug: 'todo',
    };
  }

  if (row.metadata?.domain === 'documentation') {
    return {
      id: 'documentation',
      name: 'Documentation',
      slug: 'documentation',
    };
  }

  return {
    id: 'search',
    name: 'Knowledge Base',
    slug: 'search',
  };
}

function getMatchTypeForPreview(row) {
  if (row.source_type === 'code') {
    return 'code';
  }

  if (row.metadata?.domain === 'documentation') {
    return 'documentation';
  }

  return 'text';
}

function mapHybridResult(row) {
  const preview = getMatchPreview(row);
  const category = getCategory(row);
  const href = getResultHref(row);
  const topic = row.topic_id
    ? {
        id: String(row.topic_id),
        title: row.topic_title || row.title,
        slug: row.topic_slug || null,
      }
    : null;
  const baseResult = {
    id: row.topic_id ? String(row.topic_id) : row.source_id,
    type:
      row.metadata?.domain === 'documentation'
        ? 'documentation'
        : row.source_type,
    title: row.title,
    preview,
    href,
    path: row.path || href,
    source_type: row.source_type,
    sourceType: row.source_type,
    match_type: row.match_type,
    matchType: row.match_type,
    score: Number(row.score || 0),
    metadata: row.metadata || {},
    category,
    topic,
    content: {
      id: row.source_id,
      query: row.symbol_name || row.title,
      code: row.source_type === 'code' ? preview : '',
      explanation: preview,
      complexity: '',
      uml: '',
    },
    matches: [
      {
        type: getMatchTypeForPreview(row),
        kind: row.symbol_type || row.match_type,
        name: row.symbol_name || undefined,
        heading: row.metadata?.heading || undefined,
        snippet: preview,
      },
    ],
  };

  if (row.metadata?.domain === 'documentation') {
    return {
      ...baseResult,
      id: `documentation:${row.metadata.document_id || row.source_id}`,
      documentId: row.metadata.document_id || row.source_id,
      matchedHeading: row.metadata.heading || row.symbol_name || row.title,
      snippet: preview,
      spaceName: row.metadata.space_name || '',
      instructionType: row.metadata.instruction_type || 'general',
    };
  }

  return baseResult;
}

function isStrongHybridResult(result) {
  if (!result) {
    return false;
  }

  if (result.match_type === 'exact') {
    return true;
  }

  if (result.match_type === 'semantic') {
    return result.score >= 18;
  }

  return result.score >= 6;
}

async function search(queryText, options = {}) {
  const searchQuery = String(queryText || '').trim();

  if (!searchQuery) {
    return {
      available: true,
      results: [],
      strongResults: [],
      codeLike: false,
    };
  }

  const codeLike = isCodeLikeQuery(searchQuery);
  let embedding = null;

  try {
    embedding = await createEmbedding(searchQuery);
  } catch (error) {
    console.warn(`[search] Semantic embedding skipped: ${error.message}`);
  }

  try {
    const rows = await searchDocumentRepository.hybridSearchDocuments({
      searchQuery,
      codeLike,
      embedding,
      actor: options.actor,
      type: normalizeType(options.type),
      categoryId: normalizePositiveInteger(options.categoryId),
      topicId: normalizePositiveInteger(options.topicId),
      language: options.language,
      limit: normalizePositiveInteger(options.limit) || 20,
      fuzzyThreshold: codeLike ? 0.2 : 0.28,
    });
    const results = rows.map(mapHybridResult);

    return {
      available: true,
      results,
      strongResults: results.filter(isStrongHybridResult),
      codeLike,
    };
  } catch (error) {
    if (UNAVAILABLE_DATABASE_CODES.has(error.code)) {
      console.warn(`[search] Hybrid search unavailable: ${error.message}`);
      return {
        available: false,
        results: [],
        strongResults: [],
        codeLike,
      };
    }

    throw error;
  }
}

module.exports = {
  isCodeLikeQuery,
  isStrongHybridResult,
  search,
};
