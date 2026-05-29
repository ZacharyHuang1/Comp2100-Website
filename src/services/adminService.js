const path = require('path');
const adminRepository = require('../repositories/adminRepository');
const codebaseImportService = require('./codebaseImportService');
const contentVariantService = require('./contentVariantService');
const markdownService = require('./markdownService');
const symbolIndexService = require('./symbolIndexService');
const { createHttpError, generateSlug } = require('./categoryService');

function normalizeRequiredString(value, fieldName) {
  const normalizedValue = typeof value === 'string' ? value.trim() : '';

  if (!normalizedValue) {
    throw createHttpError(400, `${fieldName} is required`);
  }

  return normalizedValue;
}

function normalizePositiveId(value, fieldName) {
  const normalizedValue = Number(value);

  if (!Number.isInteger(normalizedValue) || normalizedValue <= 0) {
    throw createHttpError(400, `${fieldName} must be a positive integer`);
  }

  return normalizedValue;
}

function normalizeOptionalPositiveId(value, fieldName) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  return normalizePositiveId(value, fieldName);
}

function mapTopic(row) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    categoryId: row.category_id,
    visibility: row.visibility,
    category: {
      id: row.category_id,
      name: row.category_name,
      slug: row.category_slug,
    },
    contentCount: row.content_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapContent(row) {
  return {
    id: row.id,
    topicId: row.topic_id,
    query: row.query,
    code: row.code,
    explanation: row.explanation,
    complexity: row.complexity,
    uml: row.uml,
    visibility: row.visibility,
    topicVisibility: row.topic_visibility,
    topic: {
      id: row.topic_id,
      title: row.topic_title,
      slug: row.topic_slug,
    },
    category: {
      id: row.category_id,
      name: row.category_name,
      slug: row.category_slug,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMarkdownSearchItem(content) {
  return {
    id: content.topic.id,
    title: content.topic.title,
    category: content.category,
    content: {
      id: content.id,
      query: content.query,
      code: content.code,
      explanation: content.explanation,
      complexity: content.complexity,
      uml: content.uml,
    },
  };
}

function splitIdentifierWords(value) {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
}

function getTitleFromJavaFile(filename, code) {
  const publicTypeMatch = code.match(
    /public\s+(?:abstract\s+|final\s+)?(?:class|interface|enum|record)\s+([A-Za-z_$][\w$]*)/
  );
  const baseName = path.basename(filename, path.extname(filename));
  const rawTitle = publicTypeMatch ? publicTypeMatch[1] : baseName;

  return splitIdentifierWords(rawTitle);
}

async function listCategories() {
  return adminRepository.getCategories();
}

async function createCategory(payload) {
  const name = normalizeRequiredString(payload.name, 'Category name');
  const parentId = normalizeOptionalPositiveId(payload.parentId, 'parentId');

  if (parentId) {
    const parentCategory = await adminRepository.getCategoryById(parentId);

    if (!parentCategory) {
      throw createHttpError(404, 'Parent category not found');
    }
  }

  return adminRepository.createCategory({
    name,
    slug: generateSlug(name),
    parentId,
  });
}

async function updateCategory(id, payload) {
  const categoryId = normalizePositiveId(id, 'category id');
  const name = normalizeRequiredString(payload.name, 'Category name');
  const parentId = normalizeOptionalPositiveId(payload.parentId, 'parentId');

  const existingCategory = await adminRepository.getCategoryById(categoryId);

  if (!existingCategory) {
    throw createHttpError(404, 'Category not found');
  }

  if (parentId === categoryId) {
    throw createHttpError(400, 'A category cannot be its own parent');
  }

  if (parentId) {
    const parentCategory = await adminRepository.getCategoryById(parentId);

    if (!parentCategory) {
      throw createHttpError(404, 'Parent category not found');
    }
  }

  return adminRepository.updateCategory(categoryId, {
    name,
    slug: generateSlug(name),
    parentId,
  });
}

async function deleteCategory(id) {
  const categoryId = normalizePositiveId(id, 'category id');
  const topicCount = await adminRepository.countTopicsByCategory(categoryId);
  const childCount = await adminRepository.countChildCategories(categoryId);

  if (topicCount > 0) {
    throw createHttpError(
      409,
      'Delete topics in this category before deleting the category'
    );
  }

  if (childCount > 0) {
    throw createHttpError(
      409,
      'Delete child categories before deleting the category'
    );
  }

  const deletedCategory = await adminRepository.deleteCategory(categoryId);

  if (!deletedCategory) {
    throw createHttpError(404, 'Category not found');
  }

  return deletedCategory;
}

async function listTopics() {
  const topics = await adminRepository.getTopics();
  return topics.map(mapTopic);
}

async function createTopic(payload) {
  const title = normalizeRequiredString(payload.title, 'Topic title');
  const categoryId = normalizePositiveId(payload.categoryId, 'categoryId');
  const category = await adminRepository.getCategoryById(categoryId);

  if (!category) {
    throw createHttpError(404, 'Category not found');
  }

  const existingTopic = await adminRepository.getTopicByTitleAndCategory(
    title,
    categoryId
  );

  if (existingTopic) {
    return adminRepository.getTopicById(existingTopic.id).then(mapTopic);
  }

  const createdTopic = await adminRepository.createTopic({
    title,
    slug: generateSlug(title),
    categoryId,
  });

  return adminRepository.getTopicById(createdTopic.id).then(mapTopic);
}

async function updateTopic(id, payload) {
  const topicId = normalizePositiveId(id, 'topic id');
  const title = normalizeRequiredString(payload.title, 'Topic title');
  const categoryId = normalizePositiveId(payload.categoryId, 'categoryId');
  const category = await adminRepository.getCategoryById(categoryId);

  if (!category) {
    throw createHttpError(404, 'Category not found');
  }

  const updatedTopic = await adminRepository.updateTopic(topicId, {
    title,
    slug: generateSlug(title),
    categoryId,
  });

  if (!updatedTopic) {
    throw createHttpError(404, 'Topic not found');
  }

  return adminRepository.getTopicById(updatedTopic.id).then(mapTopic);
}

async function deleteTopic(id, options = {}) {
  const topicId = normalizePositiveId(id, 'topic id');

  if (options.cascade) {
    const deletedTopic = await adminRepository.deleteTopic(topicId);

    if (!deletedTopic) {
      throw createHttpError(404, 'Topic not found');
    }

    return deletedTopic;
  }

  const contentCount = await adminRepository.countContentsByTopic(topicId);
  const variantCount = await adminRepository.countVariantsByTopic(topicId);

  if (contentCount > 0) {
    throw createHttpError(
      409,
      'Delete content under this topic before deleting the topic'
    );
  }

  if (variantCount > 0) {
    throw createHttpError(
      409,
      'Delete variants under this topic before deleting the topic'
    );
  }

  const deletedTopic = await adminRepository.deleteTopic(topicId);

  if (!deletedTopic) {
    throw createHttpError(404, 'Topic not found');
  }

  return deletedTopic;
}

async function listContents() {
  const contents = await adminRepository.getContents();
  return contents.map(mapContent);
}

async function createContent(payload) {
  const topicId = normalizePositiveId(payload.topicId, 'topicId');
  const query = normalizeRequiredString(payload.query, 'Content query');
  const topic = await adminRepository.getTopicById(topicId);

  if (!topic) {
    throw createHttpError(404, 'Topic not found');
  }

  const createdContent = await adminRepository.createContent({
    topicId,
    query,
    code: typeof payload.code === 'string' ? payload.code : '',
    explanation:
      typeof payload.explanation === 'string' ? payload.explanation : '',
    complexity:
      typeof payload.complexity === 'string' ? payload.complexity : '',
    uml: typeof payload.uml === 'string' ? payload.uml : '',
  });
  const content = mapContent(createdContent);

  await symbolIndexService.indexContent(createdContent);
  await markdownService.writeContentToFile(mapMarkdownSearchItem(content));

  return content;
}

async function updateContent(id, payload) {
  const contentId = normalizePositiveId(id, 'content id');
  const topicId = normalizePositiveId(payload.topicId, 'topicId');
  const query = normalizeRequiredString(payload.query, 'Content query');
  const title =
    typeof payload.title === 'string' && payload.title.trim()
      ? payload.title.trim()
      : null;
  const categoryId =
    payload.categoryId !== undefined && payload.categoryId !== null
      ? normalizePositiveId(payload.categoryId, 'categoryId')
      : null;
  let topic = await adminRepository.getTopicById(topicId);

  if (!topic) {
    throw createHttpError(404, 'Topic not found');
  }

  if (title || categoryId) {
    const nextCategoryId = categoryId || topic.category_id;

    if (categoryId) {
      const category = await adminRepository.getCategoryById(categoryId);

      if (!category) {
        throw createHttpError(404, 'Category not found');
      }
    }

    topic = await adminRepository.updateTopic(topicId, {
      title: title || topic.title,
      slug: generateSlug(title || topic.title),
      categoryId: nextCategoryId,
    });
  }

  const updatedContent = await adminRepository.updateContent(contentId, {
    topicId,
    query,
    code: typeof payload.code === 'string' ? payload.code : '',
    explanation:
      typeof payload.explanation === 'string' ? payload.explanation : '',
    complexity:
      typeof payload.complexity === 'string' ? payload.complexity : '',
    uml: typeof payload.uml === 'string' ? payload.uml : '',
  });

  if (!updatedContent) {
    throw createHttpError(404, 'Content not found');
  }

  const content = mapContent(updatedContent);

  await symbolIndexService.indexContent(updatedContent);
  await markdownService.writeContentToFile(mapMarkdownSearchItem(content));

  return content;
}

async function deleteContent(id) {
  const contentId = normalizePositiveId(id, 'content id');
  const deletedContent = await adminRepository.deleteContent(contentId);

  if (!deletedContent) {
    throw createHttpError(404, 'Content not found');
  }

  return deletedContent;
}

async function uploadJavaFile({ categoryId, file }) {
  const normalizedCategoryId = normalizePositiveId(categoryId, 'categoryId');

  if (!file) {
    throw createHttpError(400, 'A Java file is required');
  }

  const originalName = path.basename(file.originalname || '');

  if (path.extname(originalName).toLowerCase() !== '.java') {
    throw createHttpError(400, 'Only .java files are supported');
  }

  const category = await adminRepository.getCategoryById(normalizedCategoryId);

  if (!category) {
    throw createHttpError(404, 'Category not found');
  }

  const code = file.buffer.toString('utf8');
  const title = getTitleFromJavaFile(originalName, code);
  const existingTopic = await adminRepository.getTopicByTitleAndCategory(
    title,
    normalizedCategoryId
  );
  const topic = existingTopic
    ? await adminRepository.getTopicById(existingTopic.id)
    : await adminRepository.createTopic({
        title,
        slug: generateSlug(title),
        categoryId: normalizedCategoryId,
      });

  const createdContent = await adminRepository.createContent({
    topicId: topic.id,
    query: title,
    code,
    explanation: 'Uploaded Java source file.',
    complexity: 'Not specified.',
    uml: '',
  });
  const content = mapContent(createdContent);

  await symbolIndexService.indexContent(createdContent);
  await markdownService.writeContentToFile(mapMarkdownSearchItem(content));

  return content;
}

async function getContent(id) {
  const contentId = normalizePositiveId(id, 'content id');
  const content = await adminRepository.getContentById(contentId);

  if (!content) {
    throw createHttpError(404, 'Content not found');
  }

  return mapContent(content);
}

async function getTopicVariants(topicId) {
  const normalizedTopicId = normalizePositiveId(topicId, 'topic id');
  const topic = await adminRepository.getTopicById(normalizedTopicId);

  if (!topic) {
    throw createHttpError(404, 'Topic not found');
  }

  return contentVariantService.getAdminVariantsByTopicId(normalizedTopicId);
}

async function updateVariant(id, payload) {
  const variantId = normalizePositiveId(id, 'variant id');
  return contentVariantService.updateVariant(variantId, payload);
}

async function deleteVariant(id) {
  const variantId = normalizePositiveId(id, 'variant id');
  return contentVariantService.deleteVariant(variantId);
}

async function importCodebase(payload = {}) {
  return codebaseImportService.importJavaCodebase({
    path: payload.path,
    name: payload.name,
    dryRun: Boolean(payload.dryRun),
  });
}

module.exports = {
  createCategory,
  createContent,
  createTopic,
  deleteCategory,
  deleteContent,
  deleteTopic,
  deleteVariant,
  getContent,
  getTopicVariants,
  importCodebase,
  listCategories,
  listContents,
  listTopics,
  updateCategory,
  updateContent,
  updateTopic,
  updateVariant,
  uploadJavaFile,
};
