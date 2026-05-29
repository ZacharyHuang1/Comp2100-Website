const { query } = require('../db');

async function getCategories() {
  const result = await query(`
    SELECT
      c.id,
      c.name,
      c.slug,
      c.parent_id,
      c.created_at,
      c.updated_at,
      COUNT(DISTINCT t.id)::int AS topic_count,
      COUNT(DISTINCT child.id)::int AS child_count
    FROM categories c
    LEFT JOIN topics t ON t.category_id = c.id
    LEFT JOIN categories child ON child.parent_id = c.id
    GROUP BY c.id
    ORDER BY c.name ASC
  `);

  return result.rows;
}

async function getCategoryById(id) {
  const result = await query(
    `
      SELECT id, name, slug, parent_id, created_at, updated_at
      FROM categories
      WHERE id = $1
    `,
    [id]
  );

  return result.rows[0] || null;
}

async function createCategory({ name, slug, parentId }) {
  const result = await query(
    `
      INSERT INTO categories (name, slug, parent_id)
      VALUES ($1, $2, $3)
      RETURNING id, name, slug, parent_id, created_at, updated_at
    `,
    [name, slug, parentId || null]
  );

  return result.rows[0];
}

async function updateCategory(id, { name, slug, parentId }) {
  const result = await query(
    `
      UPDATE categories
      SET name = $2,
          slug = $3,
          parent_id = $4,
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, name, slug, parent_id, created_at, updated_at
    `,
    [id, name, slug, parentId || null]
  );

  return result.rows[0] || null;
}

async function deleteCategory(id) {
  const result = await query(
    `
      DELETE FROM categories
      WHERE id = $1
      RETURNING id, name, slug
    `,
    [id]
  );

  return result.rows[0] || null;
}

async function countTopicsByCategory(categoryId) {
  const result = await query(
    'SELECT COUNT(*)::int AS count FROM topics WHERE category_id = $1',
    [categoryId]
  );

  return result.rows[0].count;
}

async function countChildCategories(categoryId) {
  const result = await query(
    'SELECT COUNT(*)::int AS count FROM categories WHERE parent_id = $1',
    [categoryId]
  );

  return result.rows[0].count;
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
      c.name AS category_name,
      c.slug AS category_slug,
      COUNT(ct.id)::int AS content_count
    FROM topics t
    INNER JOIN categories c ON c.id = t.category_id
    LEFT JOIN contents ct ON ct.topic_id = t.id
    GROUP BY t.id, c.id
    ORDER BY c.name ASC, t.title ASC
  `);

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
        c.name AS category_name,
        c.slug AS category_slug
      FROM topics t
      INNER JOIN categories c ON c.id = t.category_id
      WHERE t.id = $1
    `,
    [id]
  );

  return result.rows[0] || null;
}

async function getTopicByTitleAndCategory(title, categoryId) {
  const result = await query(
    `
      SELECT id, title, slug, category_id, visibility, created_at, updated_at
      FROM topics
      WHERE lower(title) = lower($1) AND category_id = $2
      LIMIT 1
    `,
    [title, categoryId]
  );

  return result.rows[0] || null;
}

async function createTopic({ title, slug, categoryId, visibility = null }) {
  const result = await query(
    `
      INSERT INTO topics (title, slug, category_id, visibility)
      VALUES ($1, $2, $3, COALESCE($4, 'public'))
      RETURNING id, title, slug, category_id, visibility, created_at, updated_at
    `,
    [title, slug, categoryId, visibility]
  );

  return result.rows[0];
}

async function updateTopic(id, { title, slug, categoryId, visibility = null }) {
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
    [id, title, slug, categoryId, visibility]
  );

  return result.rows[0] || null;
}

async function deleteTopic(id) {
  const result = await query(
    `
      DELETE FROM topics
      WHERE id = $1
      RETURNING id, title, slug
    `,
    [id]
  );

  return result.rows[0] || null;
}

async function countContentsByTopic(topicId) {
  const result = await query(
    'SELECT COUNT(*)::int AS count FROM contents WHERE topic_id = $1',
    [topicId]
  );

  return result.rows[0].count;
}

async function countVariantsByTopic(topicId) {
  const result = await query(
    'SELECT COUNT(*)::int AS count FROM content_variants WHERE topic_id = $1',
    [topicId]
  );

  return result.rows[0].count;
}

async function getContents() {
  const result = await query(`
    SELECT
      ct.id,
      ct.topic_id,
      ct.query,
      ct.code,
      ct.explanation,
      ct.complexity,
      ct.uml,
      ct.visibility,
      ct.created_at,
      ct.updated_at,
      t.title AS topic_title,
      t.slug AS topic_slug,
      t.visibility AS topic_visibility,
      c.id AS category_id,
      c.name AS category_name,
      c.slug AS category_slug
    FROM contents ct
    INNER JOIN topics t ON t.id = ct.topic_id
    INNER JOIN categories c ON c.id = t.category_id
    ORDER BY c.name ASC, t.title ASC, ct.created_at ASC
  `);

  return result.rows;
}

async function getContentById(id) {
  const result = await query(
    `
      SELECT
        ct.id,
        ct.topic_id,
        ct.query,
        ct.code,
        ct.explanation,
        ct.complexity,
        ct.uml,
        ct.visibility,
        ct.created_at,
        ct.updated_at,
        t.title AS topic_title,
        t.slug AS topic_slug,
        t.visibility AS topic_visibility,
        c.id AS category_id,
        c.name AS category_name,
        c.slug AS category_slug
      FROM contents ct
      INNER JOIN topics t ON t.id = ct.topic_id
      INNER JOIN categories c ON c.id = t.category_id
      WHERE ct.id = $1
    `,
    [id]
  );

  return result.rows[0] || null;
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
      RETURNING id
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

  return getContentById(result.rows[0].id);
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
      RETURNING id
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

  if (!result.rows[0]) {
    return null;
  }

  return getContentById(result.rows[0].id);
}

async function deleteContent(id) {
  const result = await query(
    `
      DELETE FROM contents
      WHERE id = $1
      RETURNING id, query
    `,
    [id]
  );

  return result.rows[0] || null;
}

module.exports = {
  countChildCategories,
  countContentsByTopic,
  countTopicsByCategory,
  countVariantsByTopic,
  createCategory,
  createContent,
  createTopic,
  deleteCategory,
  deleteContent,
  deleteTopic,
  getCategories,
  getCategoryById,
  getContentById,
  getContents,
  getTopicById,
  getTopicByTitleAndCategory,
  getTopics,
  updateCategory,
  updateContent,
  updateTopic,
};
