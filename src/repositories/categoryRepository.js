const { query } = require('../db');

async function getAllCategories() {
  const result = await query(
    `
      SELECT id, name, slug, parent_id, created_at, updated_at
      FROM categories
      ORDER BY name ASC
    `
  );

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

async function getCategoryByName(name) {
  const result = await query(
    `
      SELECT id, name, slug, parent_id, created_at, updated_at
      FROM categories
      WHERE lower(name) = lower($1)
      ORDER BY id ASC
      LIMIT 1
    `,
    [name]
  );

  return result.rows[0] || null;
}

async function getCategoryByNameAndParent(name, parentId) {
  const normalizedParentId = parentId || null;
  const result = await query(
    `
      SELECT id, name, slug, parent_id, created_at, updated_at
      FROM categories
      WHERE lower(name) = lower($1)
        AND (
          ($2::bigint IS NULL AND parent_id IS NULL)
          OR parent_id = $2::bigint
        )
      ORDER BY id ASC
      LIMIT 1
    `,
    [name, normalizedParentId]
  );

  return result.rows[0] || null;
}

async function getChildCategories(parentId) {
  const result = await query(
    `
      SELECT id, name, slug, parent_id, created_at, updated_at
      FROM categories
      WHERE parent_id = $1
      ORDER BY name ASC
    `,
    [parentId]
  );

  return result.rows;
}

async function getCategoryPath(categoryId) {
  const result = await query(
    `
      WITH RECURSIVE category_path AS (
        SELECT id, name, slug, parent_id, 0 AS depth
        FROM categories
        WHERE id = $1

        UNION ALL

        SELECT c.id, c.name, c.slug, c.parent_id, cp.depth + 1
        FROM categories c
        INNER JOIN category_path cp ON cp.parent_id = c.id
      )
      SELECT id, name, slug, parent_id
      FROM category_path
      ORDER BY depth DESC
    `,
    [categoryId]
  );

  return result.rows;
}

async function createCategory(category) {
  const result = await query(
    `
      INSERT INTO categories (name, slug, parent_id)
      VALUES ($1, $2, $3)
      RETURNING id, name, slug, parent_id, created_at, updated_at
    `,
    [category.name, category.slug, category.parentId || null]
  );

  return result.rows[0];
}

module.exports = {
  getAllCategories,
  getCategoryById,
  getCategoryByName,
  getCategoryByNameAndParent,
  getChildCategories,
  getCategoryPath,
  createCategory,
};
