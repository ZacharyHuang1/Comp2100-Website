const { query } = require('../db');

async function getCategories() {
  const result = await query(`
    SELECT
      id,
      name,
      slug,
      parent_id,
      created_at,
      updated_at
    FROM categories
    ORDER BY name ASC, id ASC
  `);

  return result.rows;
}

async function getTopics() {
  const result = await query(`
    SELECT
      t.id,
      t.title,
      t.slug,
      t.category_id,
      t.visibility,
      t.created_at,
      t.updated_at,
      ct.id AS content_id,
      ct.query AS content_query,
      ct.created_at AS content_created_at,
      ct.updated_at AS content_updated_at
    FROM topics t
    LEFT JOIN LATERAL (
      SELECT id, query, created_at, updated_at
      FROM contents
      WHERE topic_id = t.id
        AND visibility = 'public'
      ORDER BY created_at ASC, id ASC
      LIMIT 1
    ) ct ON true
    WHERE t.visibility = 'public'
    ORDER BY
      GREATEST(
        t.updated_at,
        COALESCE(ct.updated_at, t.updated_at),
        COALESCE(ct.created_at, t.created_at)
      ) DESC,
      lower(t.title) ASC,
      t.id ASC
  `);

  return result.rows;
}

async function getMarksByUserId(userId) {
  const result = await query(
    `
      SELECT id, user_id, item_type, item_id, created_at
      FROM explorer_marks
      WHERE user_id = $1
      ORDER BY created_at DESC, id DESC
    `,
    [userId]
  );

  return result.rows;
}

async function markItem({ userId, itemType, itemId }) {
  const result = await query(
    `
      INSERT INTO explorer_marks (user_id, item_type, item_id)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, item_type, item_id)
      DO UPDATE SET created_at = explorer_marks.created_at
      RETURNING id, user_id, item_type, item_id, created_at
    `,
    [userId, itemType, itemId]
  );

  return result.rows[0];
}

async function unmarkItem({ userId, itemType, itemId }) {
  const result = await query(
    `
      DELETE FROM explorer_marks
      WHERE user_id = $1
        AND item_type = $2
        AND item_id = $3
      RETURNING id, user_id, item_type, item_id, created_at
    `,
    [userId, itemType, itemId]
  );

  return result.rows[0] || null;
}

async function deleteMarksForItem(itemType, itemId) {
  await query(
    `
      DELETE FROM explorer_marks
      WHERE item_type = $1
        AND item_id = $2
    `,
    [itemType, itemId]
  );
}

async function getTopicWithPrimaryContent(topicId) {
  const result = await query(
    `
      SELECT
        t.id,
        t.title,
        t.slug,
        t.category_id,
        t.visibility,
        t.created_at,
        t.updated_at,
        c.id AS category_id,
        c.name AS category_name,
        c.slug AS category_slug,
        c.parent_id AS category_parent_id,
        ct.id AS content_id,
        ct.query AS content_query,
        ct.code AS content_code,
        ct.explanation AS content_explanation,
        ct.complexity AS content_complexity,
        ct.uml AS content_uml,
        ct.visibility AS content_visibility,
        ct.created_at AS content_created_at,
        ct.updated_at AS content_updated_at
      FROM topics t
      INNER JOIN categories c ON c.id = t.category_id
      LEFT JOIN LATERAL (
        SELECT id, query, code, explanation, complexity, uml, visibility, created_at, updated_at
        FROM contents
        WHERE topic_id = t.id
          AND visibility = 'public'
        ORDER BY created_at ASC, id ASC
        LIMIT 1
      ) ct ON true
      WHERE t.id = $1
        AND t.visibility = 'public'
    `,
    [topicId]
  );

  return result.rows[0] || null;
}

async function deleteTopic(topicId) {
  const result = await query(
    `
      DELETE FROM topics
      WHERE id = $1
      RETURNING id, title, slug, category_id
    `,
    [topicId]
  );

  return result.rows[0] || null;
}

module.exports = {
  deleteMarksForItem,
  deleteTopic,
  getCategories,
  getMarksByUserId,
  getTopicWithPrimaryContent,
  getTopics,
  markItem,
  unmarkItem,
};
