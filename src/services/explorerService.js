const path = require('path');
const adminRepository = require('../repositories/adminRepository');
const categoryRepository = require('../repositories/categoryRepository');
const explorerRepository = require('../repositories/explorerRepository');
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

function extractPathFromQuery(queryValue) {
  const pathMatch =
    typeof queryValue === 'string'
      ? queryValue.match(/\b(?:src|test)\/[^\s]+\.java\b/)
      : null;

  return pathMatch?.[0] || '';
}

function normalizeJavaFileName(value) {
  const rawName = path.basename(normalizeRequiredString(value, 'File name'));
  const withoutUnsafeCharacters = rawName.replace(/[^\w.$-]/g, '');
  const fileName = withoutUnsafeCharacters || 'NewJavaFile.java';

  return fileName.toLowerCase().endsWith('.java') ? fileName : `${fileName}.java`;
}

function getClassNameFromFileName(fileName) {
  const baseName = path.basename(fileName, '.java');
  const sanitized = baseName
    .replace(/[^A-Za-z0-9_$]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

  if (!sanitized) {
    return 'NewJavaFile';
  }

  return /^[A-Za-z_$]/.test(sanitized) ? sanitized : `Java${sanitized}`;
}

function getClassNameFromCode(code, fallbackClassName) {
  const declarationMatch = code.match(
    /\b(?:class|interface|enum|record)\s+([A-Za-z_$][\w$]*)/
  );

  return declarationMatch?.[1] || fallbackClassName;
}

function buildDefaultJavaCode(className) {
  return `public class ${className} {\n}\n`;
}

function buildSimpleUml(className) {
  return `classDiagram\nclass ${className} {\n}`;
}

function stripRenameTerms(queryValue, oldTitle, newTitle) {
  const oldClassName = getClassNameFromFileName(oldTitle);
  const newClassName = getClassNameFromFileName(newTitle);
  const escapedOldTitle = oldTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const oldPathPattern = new RegExp(`\\b(?:src|test)/\\S*${escapedOldTitle}\\b`, 'gi');
  const termsToRemove = new Set(
    [oldTitle, oldClassName, newTitle, newClassName]
      .filter(Boolean)
      .map((term) => term.toLowerCase())
  );

  return String(queryValue || '')
    .replace(oldPathPattern, ' ')
    .split(/\s+/)
    .filter((part) => part && !termsToRemove.has(part.toLowerCase()))
    .join(' ')
    .trim();
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

function mapContent(row) {
  return {
    id: row.id,
    topicId: row.topic_id,
    query: row.query,
    code: row.code,
    explanation: row.explanation,
    complexity: row.complexity,
    uml: row.uml,
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

function mapTopicWithContent(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    category: {
      id: row.category_id,
      name: row.category_name,
      slug: row.category_slug,
      parent_id: row.category_parent_id,
    },
    content: row.content_id
      ? {
          id: row.content_id,
          query: row.content_query,
          code: row.content_code,
          explanation: row.content_explanation,
          complexity: row.content_complexity,
          uml: row.content_uml,
          createdAt: row.content_created_at,
          updatedAt: row.content_updated_at,
        }
      : null,
  };
}

function getCategoryPathLabel(pathRows) {
  return pathRows.map((category) => category.name).join(' ');
}

function normalizeName(value) {
  return String(value || '').trim().toLowerCase();
}

function getNodeLabel(node) {
  return node.type === 'category' ? node.name : node.title;
}

function normalizeMarkItemType(value) {
  const itemType = typeof value === 'string' ? value.trim() : '';

  if (!['category', 'topic'].includes(itemType)) {
    throw createHttpError(400, 'Invalid mark item type');
  }

  return itemType;
}

function mapExplorerMark(row) {
  return {
    itemType: row.item_type,
    itemId: String(row.item_id),
    createdAt: row.created_at,
  };
}

function getTopicSortTime(topic) {
  return new Date(topic.updatedAt || topic.createdAt || 0).getTime() || 0;
}

function getTaskSortKey(title) {
  const match = String(title || '').match(/^(DS|PD|DP)(\d{1,3})\b/i);

  if (!match) {
    return null;
  }

  const prefixOrder = {
    DS: 0,
    PD: 1,
    DP: 2,
  };

  return {
    prefixRank: prefixOrder[match[1].toUpperCase()] ?? 99,
    number: Number(match[2]),
  };
}

function isNotesPath(pathNames) {
  return pathNames.some((name) =>
    ['notes', 'reference notes'].includes(normalizeName(name))
  );
}

function isMockHackathonPath(pathNames) {
  return pathNames.some((name) => normalizeName(name) === 'mock_hackathon');
}

function compareTopicNodes(left, right, pathNames) {
  if (isNotesPath(pathNames)) {
    const timeDifference = getTopicSortTime(right) - getTopicSortTime(left);

    if (timeDifference) {
      return timeDifference;
    }
  }

  if (isMockHackathonPath(pathNames)) {
    const leftTaskKey = getTaskSortKey(left.title);
    const rightTaskKey = getTaskSortKey(right.title);

    if (leftTaskKey && rightTaskKey) {
      const prefixDifference = leftTaskKey.prefixRank - rightTaskKey.prefixRank;

      if (prefixDifference) {
        return prefixDifference;
      }

      const numberDifference = leftTaskKey.number - rightTaskKey.number;

      if (numberDifference) {
        return numberDifference;
      }
    }

    if (leftTaskKey || rightTaskKey) {
      return leftTaskKey ? -1 : 1;
    }
  }

  return String(left.title).localeCompare(String(right.title), undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

async function getExplorerTree(userId = null) {
  const [categories, topics, marks] = await Promise.all([
    explorerRepository.getCategories(),
    explorerRepository.getTopics(),
    userId ? explorerRepository.getMarksByUserId(Number(userId)) : [],
  ]);
  const categoryNodes = new Map();
  const markedKeys = new Set(
    marks.map((mark) => `${mark.item_type}:${Number(mark.item_id)}`)
  );

  for (const category of categories) {
    categoryNodes.set(String(category.id), {
      id: String(category.id),
      type: 'category',
      name: category.name,
      slug: category.slug,
      parentId: category.parent_id ? String(category.parent_id) : null,
      marked: markedKeys.has(`category:${Number(category.id)}`),
      children: [],
    });
  }

  const roots = [];

  for (const categoryNode of categoryNodes.values()) {
    if (categoryNode.parentId && categoryNodes.has(categoryNode.parentId)) {
      categoryNodes.get(categoryNode.parentId).children.push(categoryNode);
    } else {
      roots.push(categoryNode);
    }
  }

  for (const topic of topics) {
    const parentNode = categoryNodes.get(String(topic.category_id));

    if (!parentNode) {
      continue;
    }

    parentNode.children.push({
      id: String(topic.id),
      type: 'topic',
      title: topic.title,
      slug: topic.slug,
      categoryId: String(topic.category_id),
      contentId: topic.content_id ? String(topic.content_id) : null,
      path: extractPathFromQuery(topic.content_query),
      marked: markedKeys.has(`topic:${Number(topic.id)}`),
      createdAt: topic.created_at,
      updatedAt:
        topic.content_updated_at ||
        topic.updated_at ||
        topic.content_created_at ||
        topic.created_at,
    });
  }

  function sortNodes(nodes, parentPathNames = []) {
    nodes.sort((left, right) => {
      if (left.type !== right.type) {
        return left.type === 'category' ? -1 : 1;
      }

      if (left.type === 'topic' && right.type === 'topic') {
        return compareTopicNodes(left, right, parentPathNames);
      }

      const rootRank = (node) =>
        node.type === 'category' && node.name.toLowerCase() === 'code bases'
          ? 0
          : 1;
      const rankDifference = rootRank(left) - rootRank(right);

      if (rankDifference !== 0) {
        return rankDifference;
      }

      return getNodeLabel(left).localeCompare(getNodeLabel(right), undefined, {
        numeric: true,
        sensitivity: 'base',
      });
    });

    for (const node of nodes) {
      if (node.type === 'category') {
        sortNodes(node.children, [...parentPathNames, node.name]);
      }
    }
  }

  sortNodes(roots);
  return roots;
}

async function getMarks(userId) {
  return {
    marks: (await explorerRepository.getMarksByUserId(Number(userId))).map(
      mapExplorerMark
    ),
  };
}

async function ensureMarkableItem(itemType, itemId) {
  if (itemType === 'category') {
    const category = await adminRepository.getCategoryById(itemId);

    if (!category) {
      throw createHttpError(404, 'Folder not found');
    }

    return;
  }

  const topic = await adminRepository.getTopicById(itemId);

  if (!topic || topic.visibility === 'internal') {
    throw createHttpError(404, 'File not found');
  }
}

async function markItem(userId, payload) {
  const itemType = normalizeMarkItemType(payload.itemType || payload.item_type);
  const itemId = normalizePositiveId(payload.itemId || payload.item_id, 'itemId');

  await ensureMarkableItem(itemType, itemId);

  return {
    marked: true,
    mark: mapExplorerMark(
      await explorerRepository.markItem({
        userId: Number(userId),
        itemType,
        itemId,
      })
    ),
  };
}

async function unmarkItem(userId, payload) {
  const itemType = normalizeMarkItemType(payload.itemType || payload.item_type);
  const itemId = normalizePositiveId(payload.itemId || payload.item_id, 'itemId');

  await explorerRepository.unmarkItem({
    userId: Number(userId),
    itemType,
    itemId,
  });

  return { marked: false, itemType, itemId: String(itemId) };
}

async function createCategory(payload) {
  const name = normalizeRequiredString(payload.name, 'Folder name');
  const parentId = normalizeOptionalPositiveId(payload.parentId, 'parentId');

  if (parentId) {
    const parentCategory = await adminRepository.getCategoryById(parentId);

    if (!parentCategory) {
      throw createHttpError(404, 'Parent folder not found');
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
  const name = normalizeRequiredString(payload.name, 'Folder name');
  const parentId = normalizeOptionalPositiveId(payload.parentId, 'parentId');
  const existingCategory = await adminRepository.getCategoryById(categoryId);

  if (!existingCategory) {
    throw createHttpError(404, 'Folder not found');
  }

  if (parentId === categoryId) {
    throw createHttpError(400, 'A folder cannot be its own parent');
  }

  if (parentId) {
    const parentCategory = await adminRepository.getCategoryById(parentId);

    if (!parentCategory) {
      throw createHttpError(404, 'Parent folder not found');
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
  const [topicCount, childCount] = await Promise.all([
    adminRepository.countTopicsByCategory(categoryId),
    adminRepository.countChildCategories(categoryId),
  ]);

  if (topicCount > 0 || childCount > 0) {
    throw createHttpError(409, 'This folder is not empty.');
  }

  const deletedCategory = await adminRepository.deleteCategory(categoryId);

  if (!deletedCategory) {
    throw createHttpError(404, 'Folder not found');
  }

  await explorerRepository.deleteMarksForItem('category', categoryId);

  return deletedCategory;
}

async function createJavaFile(categoryId, payload) {
  const normalizedCategoryId = normalizePositiveId(categoryId, 'category id');
  const category = await adminRepository.getCategoryById(normalizedCategoryId);

  if (!category) {
    throw createHttpError(404, 'Folder not found');
  }

  const fileName = normalizeJavaFileName(payload.fileName);
  const fallbackClassName = getClassNameFromFileName(fileName);
  const code =
    typeof payload.code === 'string' && payload.code.trim()
      ? payload.code
      : buildDefaultJavaCode(fallbackClassName);
  const className = getClassNameFromCode(code, fallbackClassName);
  const existingTopic = await adminRepository.getTopicByTitleAndCategory(
    fileName,
    normalizedCategoryId
  );

  if (existingTopic) {
    throw createHttpError(409, 'A file with this name already exists here');
  }

  const categoryPath = await categoryRepository.getCategoryPath(
    normalizedCategoryId
  );
  const queryValue = [
    fileName,
    className,
    getCategoryPathLabel(categoryPath),
  ]
    .filter(Boolean)
    .join(' ');
  const topic = await adminRepository.createTopic({
    title: fileName,
    slug: generateSlug(fileName),
    categoryId: normalizedCategoryId,
  });
  const contentRow = await adminRepository.createContent({
    topicId: topic.id,
    query: queryValue,
    code,
    explanation:
      typeof payload.explanation === 'string' && payload.explanation.trim()
        ? payload.explanation.trim()
        : 'This file was created in the codebase explorer.',
    complexity:
      typeof payload.complexity === 'string' && payload.complexity.trim()
        ? payload.complexity.trim()
        : 'Not specified.',
    uml:
      typeof payload.uml === 'string' && payload.uml.trim()
        ? payload.uml.trim()
        : buildSimpleUml(className),
  });
  const content = mapContent(contentRow);

  await symbolIndexService.indexContent(contentRow);
  await markdownService.writeContentToFile(mapMarkdownSearchItem(content));

  return {
    topic: {
      id: topic.id,
      title: topic.title,
      slug: topic.slug,
      categoryId: topic.category_id,
    },
    content,
  };
}

async function getTopicContent(topicId) {
  const normalizedTopicId = normalizePositiveId(topicId, 'topic id');
  const topic = mapTopicWithContent(
    await explorerRepository.getTopicWithPrimaryContent(normalizedTopicId)
  );

  if (!topic) {
    throw createHttpError(404, 'File not found');
  }

  return topic;
}

async function renameTopic(id, payload) {
  const topicId = normalizePositiveId(id, 'topic id');
  const title = normalizeJavaFileName(payload.title);
  const topic = await adminRepository.getTopicById(topicId);

  if (!topic) {
    throw createHttpError(404, 'File not found');
  }

  const existingTopic = await adminRepository.getTopicByTitleAndCategory(
    title,
    topic.category_id
  );

  if (existingTopic && Number(existingTopic.id) !== topicId) {
    throw createHttpError(409, 'A file with this name already exists here');
  }

  const updatedTopic = await adminRepository.updateTopic(topicId, {
    title,
    slug: generateSlug(title),
    categoryId: topic.category_id,
  });
  const primaryContent = await explorerRepository.getTopicWithPrimaryContent(
    topicId
  );

  if (primaryContent?.content_id) {
    const categoryPath = await categoryRepository.getCategoryPath(
      updatedTopic.category_id
    );
    const existingQuery = primaryContent.content_query || '';
    const className = getClassNameFromCode(
      primaryContent.content_code || '',
      getClassNameFromFileName(title)
    );
    const cleanedExistingQuery = stripRenameTerms(
      existingQuery,
      topic.title,
      title
    );
    const queryValue = [
      title,
      className,
      getCategoryPathLabel(categoryPath),
      cleanedExistingQuery,
    ]
      .filter(Boolean)
      .join(' ');

    const updatedContent = mapContent(
      await adminRepository.updateContent(primaryContent.content_id, {
        topicId,
        query: queryValue,
        code: primaryContent.content_code || '',
        explanation: primaryContent.content_explanation || '',
        complexity: primaryContent.content_complexity || '',
        uml: primaryContent.content_uml || '',
      })
    );

    await symbolIndexService.indexContent({
      id: updatedContent.id,
      topicId: updatedContent.topicId,
      code: updatedContent.code,
    });
    await markdownService.writeContentToFile(mapMarkdownSearchItem(updatedContent));
  }

  return updatedTopic;
}

async function updateContent(id, payload) {
  const contentId = normalizePositiveId(id, 'content id');
  const topicId = normalizePositiveId(payload.topicId, 'topicId');
  const queryValue = normalizeRequiredString(payload.query, 'Content query');
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
    throw createHttpError(404, 'File not found');
  }

  if (title || categoryId) {
    const nextCategoryId = categoryId || topic.category_id;

    if (categoryId) {
      const category = await adminRepository.getCategoryById(categoryId);

      if (!category) {
        throw createHttpError(404, 'Folder not found');
      }
    }

    topic = await adminRepository.updateTopic(topicId, {
      title: title || topic.title,
      slug: generateSlug(title || topic.title),
      categoryId: nextCategoryId,
    });
  }

  const updatedContentRow = await adminRepository.updateContent(contentId, {
    topicId,
    query: queryValue,
    code: typeof payload.code === 'string' ? payload.code : '',
    explanation:
      typeof payload.explanation === 'string' ? payload.explanation : '',
    complexity:
      typeof payload.complexity === 'string' ? payload.complexity : '',
    uml: typeof payload.uml === 'string' ? payload.uml : '',
  });

  if (!updatedContentRow) {
    throw createHttpError(404, 'Content not found');
  }

  const updatedContent = mapContent(updatedContentRow);

  await symbolIndexService.indexContent(updatedContentRow);
  await markdownService.writeContentToFile(mapMarkdownSearchItem(updatedContent));

  return updatedContent;
}

async function deleteTopic(id) {
  const topicId = normalizePositiveId(id, 'topic id');
  const deletedTopic = await explorerRepository.deleteTopic(topicId);

  if (!deletedTopic) {
    throw createHttpError(404, 'File not found');
  }

  await explorerRepository.deleteMarksForItem('topic', topicId);

  return deletedTopic;
}

module.exports = {
  createCategory,
  createJavaFile,
  deleteCategory,
  deleteTopic,
  getExplorerTree,
  getMarks,
  getTopicContent,
  markItem,
  renameTopic,
  unmarkItem,
  updateCategory,
  updateContent,
};
