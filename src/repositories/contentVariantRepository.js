const { query } = require('../db');

async function getVariantsByTopicId(topicId) {
  const result = await query(
    `
      SELECT
        id,
        topic_id,
        parent_content_id,
        label,
        instruction,
        code,
        explanation,
        complexity,
        uml,
        created_at,
        updated_at
      FROM content_variants
      WHERE topic_id = $1
      ORDER BY id ASC
    `,
    [topicId]
  );

  return result.rows;
}

async function getVariantById(id) {
  const result = await query(
    `
      SELECT
        cv.id,
        cv.topic_id,
        cv.parent_content_id,
        cv.label,
        cv.instruction,
        cv.code,
        cv.explanation,
        cv.complexity,
        cv.uml,
        cv.created_at,
        cv.updated_at,
        t.visibility AS topic_visibility
      FROM content_variants cv
      INNER JOIN topics t ON t.id = cv.topic_id
      WHERE cv.id = $1
    `,
    [id]
  );

  return result.rows[0] || null;
}

async function countVariantsByTopicId(topicId) {
  const result = await query(
    'SELECT COUNT(*)::int AS count FROM content_variants WHERE topic_id = $1',
    [topicId]
  );

  return result.rows[0].count;
}

async function createVariant(variant) {
  const result = await query(
    `
      INSERT INTO content_variants (
        topic_id,
        parent_content_id,
        label,
        instruction,
        code,
        explanation,
        complexity,
        uml
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING
        id,
        topic_id,
        parent_content_id,
        label,
        instruction,
        code,
        explanation,
        complexity,
        uml,
        created_at,
        updated_at
    `,
    [
      variant.topicId,
      variant.parentContentId || null,
      variant.label,
      variant.instruction || null,
      variant.code || null,
      variant.explanation || null,
      variant.complexity || null,
      variant.uml || null,
    ]
  );

  return result.rows[0];
}

async function updateVariant(id, variant) {
  const result = await query(
    `
      UPDATE content_variants
      SET label = $2,
          code = $3,
          explanation = $4,
          complexity = $5,
          uml = $6,
          updated_at = NOW()
      WHERE id = $1
      RETURNING
        id,
        topic_id,
        parent_content_id,
        label,
        instruction,
        code,
        explanation,
        complexity,
        uml,
        created_at,
        updated_at
    `,
    [
      id,
      variant.label,
      variant.code || null,
      variant.explanation || null,
      variant.complexity || null,
      variant.uml || null,
    ]
  );

  return result.rows[0] || null;
}

async function deleteVariant(id) {
  const result = await query(
    `
      DELETE FROM content_variants
      WHERE id = $1
      RETURNING id, topic_id, label
    `,
    [id]
  );

  return result.rows[0] || null;
}

module.exports = {
  countVariantsByTopicId,
  createVariant,
  deleteVariant,
  getVariantById,
  getVariantsByTopicId,
  updateVariant,
};
