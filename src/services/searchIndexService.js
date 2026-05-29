const crypto = require('crypto');
const { query } = require('../db');
const searchDocumentRepository = require('../repositories/searchDocumentRepository');
const { splitSections, slugifyDocumentationHeading } = require('./documentationSearchService');
const {
  buildEmbeddingText,
  createEmbedding,
  getEmbeddingModel,
  isEmbeddingConfigured,
} = require('./embeddingService');
const { extractJavaSymbols } = require('../utils/javaSymbolExtractor');

const MAX_PREVIEW_LENGTH = 260;
const MIN_CHUNK_TOKENS = 600;
const MAX_CHUNK_TOKENS = 1200;

function normalizeText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugPathSegment(value) {
  return (
    String(value || '')
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}._-]+/gu, '-')
      .replace(/^-+|-+$/g, '') || 'item'
  );
}

function hashContent(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex');
}

function getPreview(value) {
  const text = normalizeText(value);

  if (text.length <= MAX_PREVIEW_LENGTH) {
    return text;
  }

  return `${text.slice(0, MAX_PREVIEW_LENGTH - 3).trim()}...`;
}

function countTokens(value) {
  return String(value || '').split(/\s+/).filter(Boolean).length;
}

function splitLongText(text, { minTokens = MIN_CHUNK_TOKENS, maxTokens = MAX_CHUNK_TOKENS } = {}) {
  const words = String(text || '').split(/\s+/).filter(Boolean);

  if (words.length <= maxTokens) {
    return [String(text || '').trim()].filter(Boolean);
  }

  const chunks = [];
  let index = 0;

  while (index < words.length) {
    const nextWords = words.slice(index, index + maxTokens);
    chunks.push(nextWords.join(' '));
    index += Math.max(minTokens, nextWords.length);
  }

  return chunks;
}

function buildCategoryPathMap(categories) {
  const byId = new Map(categories.map((category) => [String(category.id), category]));
  const cache = new Map();

  function getPath(categoryId) {
    const key = String(categoryId || '');

    if (cache.has(key)) {
      return cache.get(key);
    }

    const category = byId.get(key);

    if (!category) {
      return [];
    }

    const parentPath = category.parent_id ? getPath(category.parent_id) : [];
    const path = [...parentPath, category];
    cache.set(key, path);
    return path;
  }

  for (const category of categories) {
    getPath(category.id);
  }

  return {
    getPath,
    getPathLabel(categoryId) {
      return getPath(categoryId)
        .map((category) => category.name)
        .filter(Boolean)
        .join(' / ');
    },
    getSlugPath(categoryId) {
      return getPath(categoryId)
        .map((category) => category.slug || slugPathSegment(category.name))
        .filter(Boolean)
        .join('/');
    },
  };
}

function extractIdentifiers({ code = '', path = '', title = '', symbols = [] }) {
  const identifiers = new Set();
  const identifierPattern = /\b[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*\b/g;

  for (const value of [code, path, title]) {
    const matches = String(value || '').match(identifierPattern) || [];
    matches.forEach((match) => identifiers.add(match));
  }

  for (const symbol of symbols) {
    if (symbol.name) {
      identifiers.add(symbol.name);
    }

    if (symbol.signature) {
      const matches = String(symbol.signature).match(identifierPattern) || [];
      matches.forEach((match) => identifiers.add(match));
    }
  }

  return [...identifiers]
    .filter((identifier) => identifier.length <= 140)
    .slice(0, 300);
}

function inferLanguage({ path = '', code = '' }) {
  const extension = String(path || '').match(/\.([A-Za-z0-9]+)$/)?.[1]?.toLowerCase();

  if (extension) {
    return extension;
  }

  if (/\b(public|private|protected)\s+(class|interface|enum|record)\b/.test(code)) {
    return 'java';
  }

  return '';
}

function inferFileName({ title, path, code, language }) {
  const pathFile = String(path || '').split('/').filter(Boolean).pop();

  if (pathFile && pathFile.includes('.')) {
    return pathFile;
  }

  const declarationName = String(code || '').match(
    /^\s*(?:(?:public|protected|private|abstract|final|static|sealed|non-sealed)\s+)*(?:class|interface|enum|record)\s+([A-Za-z_$][\w$]*)/m
  )?.[1];
  const extension = language ? `.${language === 'java' ? 'java' : language}` : '';

  return `${declarationName || slugPathSegment(title)}${extension}`;
}

function makeDocument(document) {
  const contentText = String(document.content_text || '');
  const metadata = {
    ...(document.metadata || {}),
    content_hash: hashContent(
      [
        document.title,
        document.slug,
        document.path,
        document.language,
        document.symbol_name,
        contentText,
      ].join('\n')
    ),
  };

  return {
    ...document,
    content_text: contentText,
    content_preview: document.content_preview || getPreview(contentText),
    metadata,
  };
}

function createTopicPath(categoryPaths, row) {
  const categoryPath = categoryPaths.getSlugPath(row.category_id);
  return `/category/${row.category_id}/${categoryPath}/${row.topic_slug || slugPathSegment(row.topic_title)}`;
}

function buildCategoryDocuments(categories, categoryPaths) {
  return categories.map((category) => {
    const pathLabel = categoryPaths.getPathLabel(category.id);

    return makeDocument({
      source_type: 'category',
      source_id: `category:${category.id}`,
      category_id: category.id,
      topic_id: null,
      title: category.name,
      slug: category.slug,
      path: `/category/${category.id}`,
      language: '',
      symbol_name: '',
      symbol_type: '',
      content_text: pathLabel,
      metadata: {
        domain: 'category',
        visibility: 'public',
      },
    });
  });
}

function buildTopicDocuments(topics, categoryPaths) {
  return topics.map((row) =>
    makeDocument({
      source_type: 'topic',
      source_id: `topic:${row.id}`,
      category_id: row.category_id,
      topic_id: row.id,
      title: row.title,
      slug: row.slug,
      path: createTopicPath(categoryPaths, {
        category_id: row.category_id,
        topic_slug: row.slug,
        topic_title: row.title,
      }),
      language: '',
      symbol_name: '',
      symbol_type: '',
      content_text: [
        row.title,
        row.slug,
        categoryPaths.getPathLabel(row.category_id),
      ].join('\n'),
      metadata: {
        domain: 'topic',
        visibility: row.visibility || 'public',
      },
    })
  );
}

function buildTextContentDocuments(rows, categoryPaths) {
  const documents = [];

  for (const row of rows) {
    const baseText = [
      row.task_description,
      row.explanation,
      row.complexity,
      row.uml,
    ]
      .filter(Boolean)
      .join('\n\n');
    const chunks = splitLongText(baseText);

    chunks.forEach((chunk, index) => {
      documents.push(
        makeDocument({
          source_type: 'doc',
          source_id: `content:${row.id}:text:${index}`,
          category_id: row.category_id,
          topic_id: row.topic_id,
          title: row.topic_title,
          slug: row.topic_slug,
          path: `/topic/${row.topic_id}`,
          language: '',
          symbol_name: '',
          symbol_type: '',
          content_text: [
            row.topic_title,
            row.query,
            categoryPaths.getPathLabel(row.category_id),
            chunk,
          ].join('\n\n'),
          metadata: {
            domain: 'topic',
            content_id: String(row.id),
            chunk_index: index,
            visibility: row.topic_visibility === 'public' && row.visibility === 'public'
              ? 'public'
              : 'internal',
          },
        })
      );
    });
  }

  return documents;
}

function buildCodeDocuments(rows, categoryPaths, sourcePrefix) {
  const documents = [];

  for (const row of rows) {
    const code = String(row.code || '');

    if (!code.trim()) {
      continue;
    }

    const symbols = extractJavaSymbols(code);
    const language = inferLanguage({ code, path: row.path || '' }) || 'java';
    const fileName = inferFileName({
      title: row.title,
      path: row.path,
      code,
      language,
    });
    const categoryPath = categoryPaths.getSlugPath(row.category_id);
    const filePath = row.path || `${categoryPath}/${fileName}`.replace(/^\/+/, '');
    const primarySymbol =
      symbols.find((symbol) =>
        ['class', 'interface', 'enum', 'record'].includes(symbol.kind)
      ) || symbols[0] || null;
    const identifiers = extractIdentifiers({
      code,
      path: filePath,
      title: row.title,
      symbols,
    });
    const chunks = splitLongText(code, { minTokens: 700, maxTokens: 1400 });

    chunks.forEach((chunk, index) => {
      documents.push(
        makeDocument({
          source_type: 'code',
          source_id: `${sourcePrefix}:${row.id}:code:${index}`,
          category_id: row.category_id,
          topic_id: row.topic_id,
          title: row.title,
          slug: row.slug,
          path: filePath,
          language,
          symbol_name: primarySymbol?.name || identifiers[0] || fileName,
          symbol_type: primarySymbol?.kind || 'file',
          content_text: [
            row.title,
            row.query,
            filePath,
            identifiers.join(' '),
            row.explanation,
            chunk,
          ].join('\n\n'),
          content_preview: getPreview(row.explanation || chunk),
          metadata: {
            domain: 'topic',
            content_id: row.content_id ? String(row.content_id) : undefined,
            variant_id: row.variant_id ? String(row.variant_id) : undefined,
            file_name: fileName,
            symbols,
            identifiers,
            identifier_lowers: identifiers.map((identifier) =>
              identifier.toLowerCase()
            ),
            chunk_index: index,
            visibility: row.topic_visibility === 'public' && row.visibility !== 'internal'
              ? 'public'
              : 'internal',
          },
        })
      );
    });
  }

  return documents;
}

function buildDocumentationDocuments(rows) {
  const documents = [];

  for (const row of rows) {
    const sections = splitSections(row.content || '');
    const candidates = sections.length
      ? sections
      : [
          {
            heading: row.title,
            slug: slugifyDocumentationHeading(row.title),
            content: row.content || '',
          },
        ];

    for (const section of candidates) {
      const chunks = splitLongText(section.content || row.content || '');

      chunks.forEach((chunk, index) => {
        const heading = section.heading || row.title;
        const slug = section.slug || slugifyDocumentationHeading(heading);

        documents.push(
          makeDocument({
            source_type: 'doc',
            source_id: `documentation:${row.id}:${slug}:${index}`,
            category_id: null,
            topic_id: null,
            title: row.title,
            slug,
            path: `/documentation/doc/${row.id}#${slug}`,
            language: '',
            symbol_name: heading,
            symbol_type: 'heading',
            content_text: [
              row.title,
              heading,
              row.space_name,
              row.instruction_type,
              chunk,
            ].join('\n\n'),
            metadata: {
              domain: 'documentation',
              document_id: String(row.id),
              heading,
              space_id: String(row.space_id),
              space_name: row.space_name || '',
              instruction_type: row.instruction_type || 'general',
              visibility: row.visibility || 'private',
              owner_user_id: row.owner_user_id ? String(row.owner_user_id) : '',
              archived: Boolean(row.archived),
              chunk_index: index,
            },
          })
        );
      });
    }
  }

  return documents;
}

function buildTaskDocuments(rows) {
  return rows.map((row) =>
    makeDocument({
      source_type: 'task',
      source_id: `task:${row.id}`,
      category_id: row.linked_category_id || null,
      topic_id: row.linked_topic_id || null,
      title: row.title,
      slug: `task-${row.id}`,
      path: `/todo/task/${row.id}`,
      language: '',
      symbol_name: row.title,
      symbol_type: 'task',
      content_text: [
        row.title,
        row.description,
        row.status,
        row.priority,
        row.list_name,
        row.linked_topic_title,
        row.linked_category_name,
      ].join('\n\n'),
      metadata: {
        domain: 'task',
        task_id: String(row.id),
        list_id: row.list_id ? String(row.list_id) : '',
        list_name: row.list_name || '',
        status: row.status,
        priority: row.priority,
        owner_user_id: row.owner_user_id ? String(row.owner_user_id) : '',
        archived: Boolean(row.archived) || row.status === 'archived',
      },
    })
  );
}

async function readIndexRows() {
  const [
    categories,
    topics,
    contents,
    variants,
    documentationPages,
    tasks,
  ] = await Promise.all([
    query('SELECT id, name, slug, parent_id FROM categories'),
    query('SELECT id, title, slug, category_id, visibility FROM topics'),
    query(`
      SELECT
        ct.id,
        ct.id AS content_id,
        ct.topic_id,
        ct.query,
        ct.task_description,
        ct.code,
        ct.explanation,
        ct.complexity,
        ct.uml,
        ct.visibility,
        t.title AS topic_title,
        t.slug AS topic_slug,
        t.visibility AS topic_visibility,
        t.category_id,
        c.name AS category_name,
        c.slug AS category_slug
      FROM contents ct
      INNER JOIN topics t ON t.id = ct.topic_id
      INNER JOIN categories c ON c.id = t.category_id
    `),
    query(`
      SELECT
        cv.id,
        cv.id AS variant_id,
        cv.topic_id,
        cv.label AS title,
        cv.label AS query,
        cv.code,
        cv.explanation,
        cv.complexity,
        cv.uml,
        'public' AS visibility,
        t.title AS topic_title,
        t.slug AS topic_slug,
        t.visibility AS topic_visibility,
        t.category_id,
        c.name AS category_name,
        c.slug AS category_slug
      FROM content_variants cv
      INNER JOIN topics t ON t.id = cv.topic_id
      INNER JOIN categories c ON c.id = t.category_id
    `),
    query(`
      SELECT
        p.id,
        p.space_id,
        p.title,
        p.content,
        p.instruction_type,
        p.owner_user_id,
        p.visibility,
        p.archived,
        s.name AS space_name
      FROM documentation_pages p
      INNER JOIN documentation_spaces s ON s.id = p.space_id
    `),
    query(`
      SELECT
        t.id,
        t.list_id,
        t.title,
        t.description,
        t.status,
        t.priority,
        t.owner_user_id,
        t.archived,
        t.linked_topic_id,
        t.linked_category_id,
        l.name AS list_name,
        topic.title AS linked_topic_title,
        category.name AS linked_category_name
      FROM todo_tasks t
      LEFT JOIN todo_lists l ON l.id = t.list_id
      LEFT JOIN topics topic ON topic.id = t.linked_topic_id
      LEFT JOIN categories category ON category.id = t.linked_category_id
    `),
  ]);

  return {
    categories: categories.rows,
    topics: topics.rows,
    contents: contents.rows,
    variants: variants.rows,
    documentationPages: documentationPages.rows,
    tasks: tasks.rows,
  };
}

async function buildSearchDocuments() {
  const rows = await readIndexRows();
  const categoryPaths = buildCategoryPathMap(rows.categories);
  const contentCodeRows = rows.contents.map((row) => ({
    ...row,
    id: row.id,
    title: row.topic_title,
    slug: row.topic_slug,
  }));
  const variantCodeRows = rows.variants.map((row) => ({
    ...row,
    id: row.id,
    content_id: null,
    title: `${row.topic_title} - ${row.title}`,
    slug: row.topic_slug,
  }));

  return [
    ...buildCategoryDocuments(rows.categories, categoryPaths),
    ...buildTopicDocuments(rows.topics, categoryPaths),
    ...buildTextContentDocuments(rows.contents, categoryPaths),
    ...buildCodeDocuments(contentCodeRows, categoryPaths, 'content'),
    ...buildTextContentDocuments(
      rows.variants.map((row) => ({
        ...row,
        id: `variant:${row.id}`,
        task_description: '',
        topic_title: `${row.topic_title} - ${row.title}`,
        topic_slug: row.topic_slug,
        visibility: 'public',
      })),
      categoryPaths
    ),
    ...buildCodeDocuments(variantCodeRows, categoryPaths, 'variant'),
    ...buildDocumentationDocuments(rows.documentationPages),
    ...buildTaskDocuments(rows.tasks),
  ];
}

async function embedMissingDocuments({ limit = 50 } = {}) {
  if (!isEmbeddingConfigured()) {
    return {
      configured: false,
      embedded: 0,
      remaining: null,
      model: getEmbeddingModel(),
    };
  }

  const model = getEmbeddingModel();
  let embedded = 0;
  let batch = await searchDocumentRepository.getDocumentsMissingEmbeddings({
    model,
    limit,
  });

  while (batch.length) {
    let batchEmbedded = 0;

    for (const document of batch) {
      const embedding = await createEmbedding(buildEmbeddingText(document));
      if (embedding) {
        await searchDocumentRepository.updateEmbedding(document.id, embedding, model);
        embedded += 1;
        batchEmbedded += 1;
      }
    }

    if (batch.length < limit || batchEmbedded === 0) {
      break;
    }

    batch = await searchDocumentRepository.getDocumentsMissingEmbeddings({
      model,
      limit,
    });
  }

  const status = await searchDocumentRepository.getSearchIndexStatus();

  return {
    configured: true,
    embedded,
    remaining: status.missingEmbeddingCount,
    model,
  };
}

async function rebuildSearchIndex({ embed = true } = {}) {
  const documents = await buildSearchDocuments();
  const keys = documents.map((document) => ({
    source_type: document.source_type,
    source_id: document.source_id,
  }));
  const model = getEmbeddingModel();
  const upsertResult = await searchDocumentRepository.upsertDocuments(
    documents,
    model
  );
  const staleResult = await searchDocumentRepository.deleteStaleDocuments(keys);
  const embedResult = embed ? await embedMissingDocuments() : { embedded: 0 };
  const status = await searchDocumentRepository.getSearchIndexStatus();

  return {
    built: documents.length,
    upserted: upsertResult.upserted,
    deletedStale: staleResult.deleted,
    embeddings: embedResult,
    status,
  };
}

async function checkSearchIndex() {
  return searchDocumentRepository.getSearchIndexStatus();
}

module.exports = {
  buildSearchDocuments,
  checkSearchIndex,
  embedMissingDocuments,
  rebuildSearchIndex,
};
