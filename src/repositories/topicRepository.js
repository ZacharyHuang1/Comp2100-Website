const { query } = require('../db');

async function getTopicsByCategory(categoryId) {
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
        c.id AS category_ref_id,
        c.name AS category_name,
        c.slug AS category_slug,
        c.parent_id AS category_parent_id,
        ct.id AS content_id,
        ct.query AS content_query,
        ct.task_description AS content_task_description,
        NULL::text AS content_code,
        ct.explanation AS content_explanation,
        ct.complexity AS content_complexity,
        ct.uml AS content_uml,
        ct.visibility AS content_visibility,
        ct.created_at AS content_created_at,
        ct.updated_at AS content_updated_at
      FROM topics t
      INNER JOIN categories c ON c.id = t.category_id
      LEFT JOIN contents ct ON ct.topic_id = t.id AND ct.visibility = 'public'
      WHERE t.category_id = $1
        AND t.visibility = 'public'
      ORDER BY
        GREATEST(
          t.updated_at,
          COALESCE(ct.updated_at, t.updated_at),
          COALESCE(ct.created_at, t.created_at)
        ) DESC,
        GREATEST(t.created_at, COALESCE(ct.created_at, t.created_at)) DESC,
        lower(t.title) ASC,
        ct.created_at ASC
    `,
    [categoryId]
  );

  return result.rows;
}

async function getTopicById(id) {
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
        c.id AS category_ref_id,
        c.name AS category_name,
        c.slug AS category_slug,
        c.parent_id AS category_parent_id,
        ct.id AS content_id,
        ct.query AS content_query,
        ct.task_description AS content_task_description,
        ct.code AS content_code,
        ct.explanation AS content_explanation,
        ct.complexity AS content_complexity,
        ct.uml AS content_uml,
        ct.visibility AS content_visibility,
        ct.created_at AS content_created_at,
        ct.updated_at AS content_updated_at
      FROM topics t
      INNER JOIN categories c ON c.id = t.category_id
      LEFT JOIN contents ct ON ct.topic_id = t.id AND ct.visibility = 'public'
      WHERE t.id = $1
        AND t.visibility = 'public'
      ORDER BY ct.created_at ASC
    `,
    [id]
  );

  return result.rows;
}

async function getTopicByTitleAndCategory(title, categoryId) {
  const result = await query(
    `
      SELECT id, title, slug, category_id, visibility, created_at, updated_at
      FROM topics
      WHERE lower(title) = lower($1) AND category_id = $2
      ORDER BY id ASC
      LIMIT 1
    `,
    [title, categoryId]
  );

  return result.rows[0] || null;
}

async function createTopic(topic) {
  const result = await query(
    `
      INSERT INTO topics (title, slug, category_id, visibility)
      VALUES ($1, $2, $3, COALESCE($4, 'public'))
      RETURNING id, title, slug, category_id, visibility, created_at, updated_at
    `,
    [topic.title, topic.slug, topic.categoryId, topic.visibility || null]
  );

  return result.rows[0];
}

async function updateTopic(id, topic) {
  const result = await query(
    `
      UPDATE topics
      SET title = $2,
          slug = $3,
          category_id = $4,
          visibility = COALESCE($5, visibility),
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, title, slug, category_id, visibility, created_at, updated_at
    `,
    [id, topic.title, topic.slug, topic.categoryId, topic.visibility || null]
  );

  return result.rows[0] || null;
}

module.exports = {
  getTopicsByCategory,
  getTopicById,
  getTopicByTitleAndCategory,
  createTopic,
  updateTopic,
};
