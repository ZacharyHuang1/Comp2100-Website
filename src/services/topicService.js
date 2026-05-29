const categoryService = require('./categoryService');
const categoryRepository = require('../repositories/categoryRepository');
const topicRepository = require('../repositories/topicRepository');
const contentVariantService = require('./contentVariantService');

function mapContent(row) {
  if (!row.content_id) {
    return null;
  }

  return {
    id: row.content_id,
    query: row.content_query,
    taskDescription: row.content_task_description,
    code: row.content_code,
    explanation: row.content_explanation,
    complexity: row.content_complexity,
    uml: row.content_uml,
    createdAt: row.content_created_at,
    updatedAt: row.content_updated_at,
  };
}

function mapCategory(row) {
  return {
    id: row.category_ref_id || row.id,
    name: row.category_name || row.name,
    slug: row.category_slug || row.slug,
    parent_id: row.category_parent_id || row.parent_id || null,
  };
}

function mapTopic(rows) {
  if (!rows.length) {
    return null;
  }

  const [firstRow] = rows;

  return {
    id: firstRow.id,
    title: firstRow.title,
    slug: firstRow.slug,
    category: mapCategory(firstRow),
    content: rows.map(mapContent).filter(Boolean),
  };
}

function normalizeName(value) {
  return String(value || '').trim().toLowerCase();
}

function getTopicSortTime(topic) {
  return (topic.content || []).reduce(
    (latest, content) =>
      Math.max(
        latest,
        Date.parse(content.updatedAt || '') || 0,
        Date.parse(content.createdAt || '') || 0
      ),
    0
  );
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

function sortTopicsForCategory(topics, breadcrumbs) {
  const pathNames = breadcrumbs.map((breadcrumb) => breadcrumb.name);
      const isNotes = pathNames.some((name) =>
        ['notes', 'reference notes'].includes(normalizeName(name))
      );
  const isMockHackathon = pathNames.some(
    (name) => normalizeName(name) === 'mock_hackathon'
  );

  return [...topics].sort((left, right) => {
          if (isNotes) {
      const timeDifference = getTopicSortTime(right) - getTopicSortTime(left);

      if (timeDifference) {
        return timeDifference;
      }
    }

    if (isMockHackathon) {
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

    return left.title.localeCompare(right.title, undefined, {
      numeric: true,
      sensitivity: 'base',
    });
  });
}

async function getAllCategories() {
  return categoryService.getAllCategories();
}

async function getTopicsByCategory(categoryId) {
  const category = await categoryRepository.getCategoryById(categoryId);

  if (!category) {
    return null;
  }

  const rows = await topicRepository.getTopicsByCategory(categoryId);
  const childCategories = await categoryRepository.getChildCategories(categoryId);
  const breadcrumbs = await categoryRepository.getCategoryPath(categoryId);
  const topicsById = new Map();

  for (const row of rows) {
    if (!topicsById.has(row.id)) {
      topicsById.set(row.id, {
        id: row.id,
        title: row.title,
        slug: row.slug,
        category: mapCategory(row),
        content: [],
      });
    }

    const content = mapContent(row);

    if (content) {
      topicsById.get(row.id).content.push(content);
    }
  }

  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    parent_id: category.parent_id,
    breadcrumbs: breadcrumbs.map((breadcrumb) => ({
      id: breadcrumb.id,
      name: breadcrumb.name,
      slug: breadcrumb.slug,
      parent_id: breadcrumb.parent_id,
    })),
    subcategories: childCategories.map((childCategory) => ({
      id: childCategory.id,
      name: childCategory.name,
      slug: childCategory.slug,
      parent_id: childCategory.parent_id,
    })),
    topics: sortTopicsForCategory(Array.from(topicsById.values()), breadcrumbs),
  };
}

async function getTopicById(id) {
  const rows = await topicRepository.getTopicById(id);
  const topic = mapTopic(rows);

  if (!topic) {
    return null;
  }

  topic.breadcrumbs = await categoryRepository.getCategoryPath(
    topic.category.id
  );
  topic.variants = await contentVariantService.getPublicVariantsByTopicId(id);
  return topic;
}

async function createTopic(title, categoryId) {
  const normalizedTitle = typeof title === 'string' ? title.trim() : '';
  const normalizedCategoryId = Number(categoryId);

  if (!normalizedTitle) {
    throw categoryService.createHttpError(400, 'Topic title is required');
  }

  if (!Number.isInteger(normalizedCategoryId) || normalizedCategoryId <= 0) {
    throw categoryService.createHttpError(400, 'A valid categoryId is required');
  }

  const category = await categoryRepository.getCategoryById(normalizedCategoryId);

  if (!category) {
    throw categoryService.createHttpError(404, 'Category not found');
  }

  const existingTopic = await topicRepository.getTopicByTitleAndCategory(
    normalizedTitle,
    normalizedCategoryId
  );

  if (existingTopic) {
    throw categoryService.createHttpError(
      409,
      'A topic with this title already exists in the category'
    );
  }

  const slug = categoryService.generateSlug(normalizedTitle);

  try {
    const topic = await topicRepository.createTopic({
      title: normalizedTitle,
      slug,
      categoryId: normalizedCategoryId,
    });

    return {
      id: topic.id,
      title: topic.title,
      slug: topic.slug,
      category: {
        id: category.id,
        name: category.name,
        slug: category.slug,
      },
      content: [],
    };
  } catch (error) {
    if (error.code === '23503') {
      throw categoryService.createHttpError(
        400,
        'Topic could not be created because the category does not exist'
      );
    }

    throw error;
  }
}

async function ensureTopicExists({ topicId, topicTitle, categoryId }) {
  if (topicId !== undefined && topicId !== null) {
    const topic = await getTopicById(topicId);

    if (!topic) {
      throw categoryService.createHttpError(404, 'Topic not found');
    }

    return topic;
  }

  if (!topicTitle || !categoryId) {
    throw categoryService.createHttpError(
      400,
      'Either topicId or both topicTitle and categoryId are required'
    );
  }

  const existingTopic = await topicRepository.getTopicByTitleAndCategory(
    topicTitle,
    Number(categoryId)
  );

  if (existingTopic) {
    return getTopicById(existingTopic.id);
  }

  return createTopic(topicTitle, categoryId);
}

module.exports = {
  getAllCategories,
  getTopicsByCategory,
  getTopicById,
  createTopic,
  ensureTopicExists,
};
