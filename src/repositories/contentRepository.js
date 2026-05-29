const { query } = require('../db');

function getSearchFields() {
  return {
    title: "lower(t.title)",
    query: "lower(ct.query)",
    taskDescription: "lower(coalesce(ct.task_description, ''))",
    code: "lower(coalesce(ct.code, ''))",
    explanation: "lower(coalesce(ct.explanation, ''))",
    complexity: "lower(coalesce(ct.complexity, ''))",
    uml: "lower(coalesce(ct.uml, ''))",
    category: "lower(c.name)",
  };
}

function buildFieldMatchCondition(fieldExpressions, placeholder) {
  return Object.values(fieldExpressions)
    .map((fieldExpression) => `${fieldExpression} LIKE ${placeholder}`)
    .join(' OR ');
}

function buildSelectedFieldMatchCondition(
  fieldExpressions,
  fieldNames,
  placeholder
) {
  return fieldNames
    .map((fieldName) => `${fieldExpressions[fieldName]} LIKE ${placeholder}`)
    .join(' OR ');
}

function buildAndCondition(fieldExpression, placeholders) {
  return placeholders
    .map((placeholder) => `${fieldExpression} LIKE ${placeholder}`)
    .join(' AND ');
}

function buildTokenAcrossFieldsCondition(fieldExpressions, fieldNames, placeholders) {
  return placeholders
    .map(
      (placeholder) =>
        `(${buildSelectedFieldMatchCondition(
          fieldExpressions,
          fieldNames,
          placeholder
        )})`
    )
    .join(' AND ');
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getDeclarationSearch(normalizedQuery) {
  const declarationMatch = normalizedQuery.match(
    /^(?:public\s+)?(class|interface|enum|record)\s+([a-z][a-z0-9]*)$/
  );

  if (!declarationMatch) {
    return null;
  }

  const [, kind, identifier] = declarationMatch;
  const escapedKind = escapeRegex(kind);
  const escapedIdentifier = escapeRegex(identifier);
  const declarationPrefix =
    '(^|[^A-Za-z0-9_$])(?:public\\s+)?(?:abstract\\s+|final\\s+)?';
  const declarationSuffix = '\\s+' + escapedIdentifier + '([^A-Za-z0-9_$]|$)';

  return {
    exactRegex: `${declarationPrefix}${escapedKind}${declarationSuffix}`,
    anyRegex: `${declarationPrefix}(?:class|interface|enum|record)${declarationSuffix}`,
  };
}

function getSymbolTokenCondition(placeholder, rawToken) {
  const normalizedToken = String(rawToken || '').toLowerCase();
  const equalityChecks = [];

  if (['public', 'private', 'protected', 'package'].includes(normalizedToken)) {
    equalityChecks.push(`lower(cs.visibility) = '${normalizedToken}'`);
  }

  if (
    [
      'class',
      'interface',
      'enum',
      'record',
      'field',
      'method',
      'constructor',
      'package',
    ].includes(normalizedToken)
  ) {
    equalityChecks.push(`lower(cs.kind) = '${normalizedToken}'`);
  }

  return `(
    lower(cs.name) LIKE ${placeholder}
    OR lower(cs.signature) LIKE ${placeholder}
    OR lower(coalesce(cs.snippet, '')) LIKE ${placeholder}
    ${equalityChecks.length ? `OR ${equalityChecks.join(' OR ')}` : ''}
  )`;
}

async function searchExistingContent(searchQuery, searchTokens, searchMode) {
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const fieldExpressions = getSearchFields();
  const params = [normalizedQuery, `%${normalizedQuery}%`];
  const declarationSearch = getDeclarationSearch(normalizedQuery);
  let declarationExactCondition = '';
  let declarationAnyCondition = '';
  let whereClause = '';
  let rankingSql = '';

  if (declarationSearch) {
    params.push(declarationSearch.exactRegex);
    declarationExactCondition = `ct.code ~* $${params.length}`;
    params.push(declarationSearch.anyRegex);
    declarationAnyCondition = `ct.code ~* $${params.length}`;
  }

  if (searchMode === 'single') {
    whereClause = buildFieldMatchCondition(fieldExpressions, '$2');
    rankingSql = `
      CASE
        WHEN ${fieldExpressions.title} = $1 THEN 1
        WHEN ${fieldExpressions.title} LIKE $1 || '%' THEN 2
        WHEN ${fieldExpressions.title} LIKE $2 THEN 3
        WHEN ${fieldExpressions.query} = $1 THEN 4
        WHEN ${fieldExpressions.query} LIKE $1 || '%' THEN 5
        WHEN ${fieldExpressions.query} LIKE $2 THEN 6
        WHEN ${fieldExpressions.category} LIKE $2 THEN 7
        WHEN ${fieldExpressions.taskDescription} LIKE $2 OR ${fieldExpressions.code} LIKE $2 OR ${fieldExpressions.explanation} LIKE $2 OR ${fieldExpressions.complexity} LIKE $2 OR ${fieldExpressions.uml} LIKE $2 THEN 8
        ELSE 9
      END
    `;
  } else {
    const tokenPlaceholders = searchTokens.map((token) => {
      params.push(`%${token}%`);
      return `$${params.length}`;
    });

    const phraseMatchCondition = `(${buildFieldMatchCondition(
      fieldExpressions,
      '$2'
    )})`;
    const allTokensInTitle = buildAndCondition(
      fieldExpressions.title,
      tokenPlaceholders
    );
    const allTokensInQuery = buildAndCondition(
      fieldExpressions.query,
      tokenPlaceholders
    );
    const allTokensInTitleOrQuery = `(${allTokensInTitle} OR ${allTokensInQuery})`;
    const allTokensAcrossPrimaryFields = buildTokenAcrossFieldsCondition(
      fieldExpressions,
      ['title', 'query', 'category'],
      tokenPlaceholders
    );
    const allTokensAcrossFields = buildTokenAcrossFieldsCondition(
      fieldExpressions,
      ['title', 'query', 'taskDescription', 'code', 'explanation', 'uml', 'category'],
      tokenPlaceholders
    );

    whereClause = `(${phraseMatchCondition} OR ${allTokensInTitleOrQuery} OR ${allTokensAcrossPrimaryFields} OR ${allTokensAcrossFields})`;
    rankingSql = `
      CASE
        WHEN ${fieldExpressions.title} = $1 THEN 1
        WHEN ${fieldExpressions.query} = $1 THEN 2
        WHEN ${fieldExpressions.title} LIKE $2 THEN 3
        WHEN ${fieldExpressions.query} LIKE $2 THEN 4
        WHEN ${allTokensInTitleOrQuery} THEN 5
        WHEN ${allTokensAcrossPrimaryFields} THEN 6
        WHEN ${allTokensAcrossFields} THEN 7
        ELSE 8
      END
    `;
  }

  if (declarationSearch) {
    whereClause = `(${declarationAnyCondition} OR ${whereClause})`;
    rankingSql = `
      CASE
        WHEN ${declarationExactCondition} THEN 1
        WHEN ${declarationAnyCondition} THEN 2
        ELSE 2 + (${rankingSql})
      END
    `;
  }

  const result = await query(
    `
      SELECT
        ct.id,
        ct.topic_id,
        ct.query,
        ct.task_description,
        ct.code,
        ct.explanation,
        ct.complexity,
        ct.uml,
        ct.created_at,
        ct.updated_at,
        t.id AS topic_ref_id,
        t.title AS topic_title,
        t.slug AS topic_slug,
        c.id AS category_ref_id,
        c.name AS category_name,
        c.slug AS category_slug
      FROM contents ct
      INNER JOIN topics t ON t.id = ct.topic_id
      INNER JOIN categories c ON c.id = t.category_id
      WHERE (${whereClause})
        AND t.visibility = 'public'
        AND ct.visibility = 'public'
      ORDER BY
        ${rankingSql} ASC,
        GREATEST(t.updated_at, ct.updated_at, ct.created_at) DESC,
        length(t.title) ASC,
        t.title ASC,
        ct.created_at DESC
    `,
    params
  );

  return result.rows;
}

async function searchJavaSymbols(searchQuery, searchTokens) {
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const params = [
    normalizedQuery,
    `%${normalizedQuery}%`,
    searchTokens,
    searchTokens.filter((token) =>
      ['public', 'private', 'protected', 'package'].includes(token)
    ),
    searchTokens.filter((token) =>
      [
        'class',
        'interface',
        'enum',
        'record',
        'field',
        'method',
        'constructor',
        'package',
      ].includes(token)
    ),
  ];
  const tokenConditions = searchTokens.map((token) => {
    params.push(`%${token}%`);
    return getSymbolTokenCondition(`$${params.length}`, token);
  });

  if (!tokenConditions.length) {
    return [];
  }

  const result = await query(
    `
      SELECT
        ct.id,
        ct.topic_id,
        ct.query,
        ct.task_description,
        ct.code,
        ct.explanation,
        ct.complexity,
        ct.uml,
        ct.created_at,
        ct.updated_at,
        t.id AS topic_ref_id,
        t.title AS topic_title,
        t.slug AS topic_slug,
        c.id AS category_ref_id,
        c.name AS category_name,
        c.slug AS category_slug,
        cs.id AS match_symbol_id,
        cs.visibility AS match_visibility,
        cs.kind AS match_kind,
        cs.name AS match_name,
        cs.signature AS match_signature,
        cs.snippet AS match_snippet,
        cs.line_number AS match_line_number,
        CASE
          WHEN lower(cs.name) = ANY($3::text[])
            AND (
              COALESCE(array_length($4::text[], 1), 0) = 0
              OR lower(cs.visibility) = ANY($4::text[])
            ) THEN 1
          WHEN lower(cs.kind) = ANY($5::text[])
            AND lower(cs.name) = ANY($3::text[]) THEN 2
          WHEN lower(cs.signature) = $1 THEN 3
          WHEN lower(cs.signature) LIKE $2 THEN 4
          WHEN lower(coalesce(cs.snippet, '')) LIKE $2 THEN 5
          WHEN lower(t.title) LIKE $2 THEN 6
          ELSE 7
        END AS search_rank
      FROM content_symbols cs
      INNER JOIN contents ct ON ct.id = cs.content_id
      INNER JOIN topics t ON t.id = cs.topic_id
      INNER JOIN categories c ON c.id = t.category_id
      WHERE ${tokenConditions.map((condition) => `(${condition})`).join(' AND ')}
        AND t.visibility = 'public'
        AND ct.visibility = 'public'
      ORDER BY
        search_rank ASC,
        GREATEST(t.updated_at, ct.updated_at, ct.created_at) DESC,
        cs.line_number ASC NULLS LAST,
        t.title ASC
      LIMIT 150
    `,
    params
  );

  return result.rows;
}

async function createContent(content) {
  const result = await query(
    `
      INSERT INTO contents (
        topic_id,
        query,
        code,
        explanation,
        complexity,
        uml,
        visibility
      )
      VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 'public'))
      RETURNING
        id,
        topic_id,
        query,
        code,
        explanation,
        complexity,
        uml,
        visibility,
        created_at,
        updated_at
    `,
    [
      content.topicId,
      content.query,
      content.code || null,
      content.explanation || null,
      content.complexity || null,
      content.uml || null,
      content.visibility || null,
    ]
  );

  return result.rows[0];
}

async function getPrimaryContentByTopicId(topicId) {
  const result = await query(
    `
      SELECT
        id,
        topic_id,
        query,
        code,
        explanation,
        complexity,
        uml,
        visibility,
        created_at,
        updated_at
      FROM contents
      WHERE topic_id = $1
      ORDER BY created_at ASC, id ASC
      LIMIT 1
    `,
    [topicId]
  );

  return result.rows[0] || null;
}

async function updateContent(id, content) {
  const result = await query(
    `
      UPDATE contents
      SET topic_id = $2,
          query = $3,
          code = $4,
          explanation = $5,
          complexity = $6,
          uml = $7,
          visibility = COALESCE($8, visibility),
          updated_at = NOW()
      WHERE id = $1
      RETURNING
        id,
        topic_id,
        query,
        code,
        explanation,
        complexity,
        uml,
        visibility,
        created_at,
        updated_at
    `,
    [
      id,
      content.topicId,
      content.query,
      content.code || null,
      content.explanation || null,
      content.complexity || null,
      content.uml || null,
      content.visibility || null,
    ]
  );

  return result.rows[0] || null;
}

module.exports = {
  searchExistingContent,
  searchJavaSymbols,
  createContent,
  getPrimaryContentByTopicId,
  updateContent,
};
