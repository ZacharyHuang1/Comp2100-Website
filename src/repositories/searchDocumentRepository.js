const { pool, query } = require('../db');

function embeddingToSqlVector(embedding) {
  if (!Array.isArray(embedding) || embedding.length !== 1536) {
    return null;
  }

  return `[${embedding.map((value) => Number(value) || 0).join(',')}]`;
}

async function upsertDocuments(documents, embeddingModel) {
  if (!documents.length) {
    return { upserted: 0 };
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (const document of documents) {
      await client.query(
        `
          INSERT INTO search_documents (
            source_type,
            source_id,
            category_id,
            topic_id,
            title,
            slug,
            path,
            language,
            symbol_name,
            symbol_type,
            content_text,
            content_preview,
            metadata,
            embedding,
            embedding_model
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13::jsonb, NULL, NULL
          )
          ON CONFLICT (source_type, source_id)
          DO UPDATE SET
            category_id = EXCLUDED.category_id,
            topic_id = EXCLUDED.topic_id,
            title = EXCLUDED.title,
            slug = EXCLUDED.slug,
            path = EXCLUDED.path,
            language = EXCLUDED.language,
            symbol_name = EXCLUDED.symbol_name,
            symbol_type = EXCLUDED.symbol_type,
            content_text = EXCLUDED.content_text,
            content_preview = EXCLUDED.content_preview,
            metadata = EXCLUDED.metadata,
            embedding = CASE
              WHEN search_documents.metadata->>'content_hash' = EXCLUDED.metadata->>'content_hash'
                AND search_documents.embedding_model = $14
              THEN search_documents.embedding
              ELSE NULL
            END,
            embedding_model = CASE
              WHEN search_documents.metadata->>'content_hash' = EXCLUDED.metadata->>'content_hash'
                AND search_documents.embedding_model = $14
              THEN search_documents.embedding_model
              ELSE NULL
            END,
            updated_at = NOW()
        `,
        [
          document.source_type,
          document.source_id,
          document.category_id || null,
          document.topic_id || null,
          document.title,
          document.slug || null,
          document.path || null,
          document.language || null,
          document.symbol_name || null,
          document.symbol_type || null,
          document.content_text || '',
          document.content_preview || '',
          JSON.stringify(document.metadata || {}),
          embeddingModel,
        ]
      );
    }

    await client.query('COMMIT');
    return { upserted: documents.length };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function deleteStaleDocuments(keys) {
  if (!keys.length) {
    const result = await query('DELETE FROM search_documents');
    return { deleted: result.rowCount };
  }

  const result = await query(
    `
      DELETE FROM search_documents sd
      WHERE NOT EXISTS (
        SELECT 1
        FROM jsonb_to_recordset($1::jsonb)
          AS keepers(source_type text, source_id text)
        WHERE keepers.source_type = sd.source_type
          AND keepers.source_id = sd.source_id
      )
    `,
    [JSON.stringify(keys)]
  );

  return { deleted: result.rowCount };
}

async function getDocumentsMissingEmbeddings({ model, limit = 50 } = {}) {
  const result = await query(
    `
      SELECT
        id,
        source_type,
        source_id,
        title,
        path,
        symbol_name,
        content_text,
        content_preview
      FROM search_documents
      WHERE (embedding IS NULL OR embedding_model IS DISTINCT FROM $1)
        AND length(trim(coalesce(content_text, '') || ' ' || coalesce(title, ''))) > 0
      ORDER BY updated_at DESC, id ASC
      LIMIT $2
    `,
    [model, limit]
  );

  return result.rows;
}

async function updateEmbedding(id, embedding, model) {
  const vector = embeddingToSqlVector(embedding);

  if (!vector) {
    throw new Error('Embedding must be a 1536 dimension numeric array');
  }

  await query(
    `
      UPDATE search_documents
      SET embedding = $2::vector,
          embedding_model = $3,
          updated_at = NOW()
      WHERE id = $1
    `,
    [id, vector, model]
  );
}

function getTypeFilterSql() {
  return `
    (
      $5::text IS NULL
      OR $5::text = ''
      OR $5::text = 'all'
      OR ($5::text = 'code' AND scored.source_type = 'code')
      OR ($5::text IN ('doc', 'docs') AND scored.source_type = 'doc')
      OR ($5::text IN ('task', 'tasks') AND scored.source_type = 'task')
      OR ($5::text IN ('topic', 'topics') AND scored.source_type IN ('topic', 'category'))
    )
  `;
}

function getAccessFilterSql() {
  return `
    (
      CASE
        WHEN scored.source_type = 'task' THEN
          coalesce((scored.metadata->>'archived')::boolean, false) = false
          AND (
            $10::boolean = true
            OR scored.metadata->>'owner_user_id' = $9::text
          )
        WHEN scored.metadata->>'domain' = 'documentation' THEN
          coalesce((scored.metadata->>'archived')::boolean, false) = false
          AND (
            $10::boolean = true
            OR scored.metadata->>'owner_user_id' = $9::text
            OR scored.metadata->>'visibility' IN ('shared', 'public_to_users')
          )
        ELSE
          coalesce(scored.metadata->>'visibility', 'public') = 'public'
      END
    )
  `;
}

async function hybridSearchDocuments({
  searchQuery,
  codeLike,
  embedding = null,
  type = 'all',
  categoryId = null,
  topicId = null,
  language = null,
  actor = null,
  limit = 20,
  fuzzyThreshold = 0.28,
}) {
  const vector = embeddingToSqlVector(embedding);
  const params = [
    searchQuery,
    Boolean(codeLike),
    Math.min(Math.max(Number(limit) || 20, 1), 50),
    fuzzyThreshold,
    String(type || 'all').toLowerCase(),
    categoryId || null,
    topicId || null,
    language ? String(language).toLowerCase() : null,
    actor?.id ? String(actor.id) : '',
    ['manager', 'root_manager'].includes(actor?.role),
  ];
  const semanticSelect = vector
    ? `CASE
        WHEN sd.embedding IS NOT NULL THEN GREATEST(0, 1 - (sd.embedding <=> $11::vector))
        ELSE 0
      END`
    : '0';
  const semanticWhere = vector ? 'OR scored.semantic_score >= 0.15' : '';

  if (vector) {
    params.push(vector);
  }

  const result = await query(
    `
      WITH input AS (
        SELECT
          $1::text AS raw_query,
          lower($1::text) AS q_lower,
          $2::boolean AS code_like,
          (
            websearch_to_tsquery('english', $1::text)
            || plainto_tsquery('simple', $1::text)
          ) AS tsq
      ),
      scored AS (
        SELECT
          sd.id,
          sd.source_type,
          sd.source_id,
          sd.category_id,
          sd.topic_id,
          sd.title,
          sd.slug,
          sd.path,
          sd.language,
          sd.symbol_name,
          sd.symbol_type,
          sd.content_preview,
          sd.metadata,
          c.name AS category_name,
          c.slug AS category_slug,
          t.title AS topic_title,
          t.slug AS topic_slug,
          CASE
            WHEN lower(sd.title) = input.q_lower THEN 1.0
            WHEN lower(coalesce(sd.symbol_name, '')) = input.q_lower THEN 1.0
            WHEN coalesce(sd.metadata->'identifier_lowers', '[]'::jsonb) ? input.q_lower THEN 0.96
            WHEN lower(coalesce(sd.slug, '')) = input.q_lower THEN 0.95
            WHEN lower(coalesce(sd.path, '')) = input.q_lower THEN 0.95
            WHEN lower(regexp_replace(coalesce(sd.path, ''), '^.*/', '')) = input.q_lower THEN 0.94
            WHEN lower(coalesce(sd.symbol_name, '')) LIKE input.q_lower || '%' THEN 0.84
            WHEN lower(sd.title) LIKE input.q_lower || '%' THEN 0.82
            WHEN lower(coalesce(sd.path, '')) LIKE '%' || input.q_lower || '%' THEN 0.72
            WHEN lower(sd.title) LIKE '%' || input.q_lower || '%' THEN 0.68
            ELSE 0
          END::double precision AS exact_score,
          ts_rank_cd(sd.search_vector, input.tsq)::double precision AS keyword_score,
          GREATEST(
            similarity(lower(sd.title), input.q_lower),
            similarity(lower(coalesce(sd.slug, '')), input.q_lower),
            similarity(lower(coalesce(sd.path, '')), input.q_lower),
            similarity(lower(coalesce(sd.symbol_name, '')), input.q_lower),
            similarity(lower(left(coalesce(sd.content_text, ''), 8000)), input.q_lower)
          )::double precision AS fuzzy_score,
          ${semanticSelect}::double precision AS semantic_score
        FROM search_documents sd
        CROSS JOIN input
        LEFT JOIN categories c ON c.id = sd.category_id
        LEFT JOIN topics t ON t.id = sd.topic_id
      )
      SELECT
        scored.*,
        (
          scored.exact_score * CASE WHEN $2::boolean THEN 140 ELSE 110 END
          + scored.keyword_score * CASE WHEN $2::boolean THEN 55 ELSE 60 END
          + scored.fuzzy_score * CASE WHEN $2::boolean THEN 32 ELSE 25 END
          + scored.semantic_score * CASE WHEN $2::boolean THEN 8 ELSE 32 END
        )::double precision AS score,
        CASE
          WHEN scored.exact_score >= 0.9 THEN 'exact'
          WHEN scored.keyword_score > 0
            AND (scored.fuzzy_score >= $4::double precision OR scored.semantic_score > 0)
            THEN 'hybrid'
          WHEN scored.keyword_score > 0 THEN 'keyword'
          WHEN scored.fuzzy_score >= $4::double precision THEN 'fuzzy'
          WHEN scored.semantic_score > 0 THEN 'semantic'
          ELSE 'hybrid'
        END AS match_type
      FROM scored
      WHERE ${getTypeFilterSql()}
        AND ${getAccessFilterSql()}
        AND ($6::bigint IS NULL OR scored.category_id = $6::bigint)
        AND ($7::bigint IS NULL OR scored.topic_id = $7::bigint)
        AND ($8::text IS NULL OR lower(coalesce(scored.language, '')) = $8::text)
        AND (
          scored.exact_score > 0
          OR scored.keyword_score > 0
          OR scored.fuzzy_score >= $4::double precision
          ${semanticWhere}
        )
      ORDER BY
        scored.exact_score DESC,
        score DESC,
        scored.keyword_score DESC,
        scored.fuzzy_score DESC,
        scored.semantic_score DESC,
        scored.title ASC
      LIMIT $3
    `,
    params
  );

  return result.rows;
}

async function getSearchIndexStatus() {
  let counts;
  let bySourceType;

  try {
    [counts, bySourceType] = await Promise.all([
      query(`
        SELECT
          COUNT(*)::int AS document_count,
          COUNT(*) FILTER (WHERE embedding IS NOT NULL)::int AS embedded_count,
          COUNT(*) FILTER (WHERE embedding IS NULL)::int AS missing_embedding_count
        FROM search_documents
      `),
      query(`
        SELECT source_type, COUNT(*)::int AS source_count
        FROM search_documents
        GROUP BY source_type
        ORDER BY source_type ASC
      `),
    ]);
  } catch (error) {
    if (error.code === '42P01') {
      return {
        available: false,
        documentCount: 0,
        embeddedCount: 0,
        missingEmbeddingCount: 0,
        bySourceType: {},
      };
    }

    throw error;
  }

  const countRow = counts.rows[0] || {};

  return {
    available: true,
    documentCount: countRow.document_count || 0,
    embeddedCount: countRow.embedded_count || 0,
    missingEmbeddingCount: countRow.missing_embedding_count || 0,
    bySourceType: Object.fromEntries(
      bySourceType.rows.map((row) => [row.source_type, row.source_count])
    ),
  };
}

module.exports = {
  deleteStaleDocuments,
  getDocumentsMissingEmbeddings,
  getSearchIndexStatus,
  hybridSearchDocuments,
  updateEmbedding,
  upsertDocuments,
};
