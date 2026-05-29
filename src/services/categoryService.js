const categoryRepository = require('../repositories/categoryRepository');

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function generateSlug(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'item';
}

async function getAllCategories() {
  return categoryRepository.getAllCategories();
}

async function ensureCategoryExists(name) {
  const normalizedName = typeof name === 'string' ? name.trim() : '';

  if (!normalizedName) {
    throw createHttpError(400, 'Category name is required');
  }

  const existingCategory = await categoryRepository.getCategoryByName(
    normalizedName
  );

  if (existingCategory) {
    return existingCategory;
  }

  return createCategory(normalizedName);
}

async function ensureCategoryExistsByParent(name, parentId = null) {
  const normalizedName = typeof name === 'string' ? name.trim() : '';
  const normalizedParentId = parentId ? Number(parentId) : null;

  if (!normalizedName) {
    throw createHttpError(400, 'Category name is required');
  }

  if (
    normalizedParentId !== null &&
    (!Number.isInteger(normalizedParentId) || normalizedParentId <= 0)
  ) {
    throw createHttpError(400, 'A valid parent category is required');
  }

  const existingCategory = await categoryRepository.getCategoryByNameAndParent(
    normalizedName,
    normalizedParentId
  );

  if (existingCategory) {
    return existingCategory;
  }

  return createCategory(normalizedName, normalizedParentId);
}

async function createCategory(name, parentId = null) {
  const normalizedName = typeof name === 'string' ? name.trim() : '';
  const normalizedParentId = parentId ? Number(parentId) : null;

  if (!normalizedName) {
    throw createHttpError(400, 'Category name is required');
  }

  if (
    normalizedParentId !== null &&
    (!Number.isInteger(normalizedParentId) || normalizedParentId <= 0)
  ) {
    throw createHttpError(400, 'A valid parent category is required');
  }

  const slug = generateSlug(normalizedName);

  try {
    return await categoryRepository.createCategory({
      name: normalizedName,
      slug,
      parentId: normalizedParentId,
    });
  } catch (error) {
    if (error.code === '23505') {
      throw createHttpError(409, 'A category with this slug already exists');
    }

    throw error;
  }
}

module.exports = {
  getAllCategories,
  ensureCategoryExists,
  ensureCategoryExistsByParent,
  createCategory,
  generateSlug,
  createHttpError,
};
