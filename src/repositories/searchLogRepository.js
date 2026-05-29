const { query } = require('../db');

async function getSearchLogByUserAndQuery(userId, searchQuery) {
  const result = await query(
    `
      SELECT
        id,
        user_id,
        query,
        normalized_query,
        raw_query,
        search_count,
        last_not_found_at,
        created_at,
        updated_at
      FROM search_logs
      WHERE user_id = $1
        AND (query = $2 OR normalized_query = $2)
      LIMIT 1
    `,
    [userId, searchQuery]
  );

  return result.rows[0] || null;
}

async function createSearchLog({ userId, searchQuery, rawQuery }) {
  const result = await query(
    `
      INSERT INTO search_logs (
        user_id,
        query,
        normalized_query,
        raw_query,
        search_count,
        last_not_found_at
      )
      VALUES ($1, $2, $2, $3, 1, NOW())
      RETURNING
        id,
        user_id,
        query,
        normalized_query,
        raw_query,
        search_count,
        last_not_found_at,
        created_at,
        updated_at
    `,
    [userId, searchQuery, rawQuery || searchQuery]
  );

  return result.rows[0];
}

async function incrementSearchCount(id, rawQuery) {
  const result = await query(
    `
      UPDATE search_logs
      SET search_count = search_count + 1,
          raw_query = COALESCE($2, raw_query),
          normalized_query = COALESCE(normalized_query, query),
          last_not_found_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
      RETURNING
        id,
        user_id,
        query,
        normalized_query,
        raw_query,
        search_count,
        last_not_found_at,
        created_at,
        updated_at
    `,
    [id, rawQuery || null]
  );

  return result.rows[0] || null;
}

module.exports = {
  getSearchLogByUserAndQuery,
  createSearchLog,
  incrementSearchCount,
};
