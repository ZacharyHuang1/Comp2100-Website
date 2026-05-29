const contentVariantRepository = require('../repositories/contentVariantRepository');
const topicRepository = require('../repositories/topicRepository');
const { createHttpError } = require('./categoryService');

const MANUAL_BLOCKS = {
  java_function: {
    label: 'Function',
    code: 'public void newFunction() {\n    \n}',
    explanation: '',
    complexity: 'Not specified.',
    uml: '',
  },
  java_class: {
    label: 'Class',
    code: 'public class NewClass {\n    \n}',
    explanation: '',
    complexity: 'Not specified.',
    uml: '',
  },
  explanation: {
    label: 'Explanation',
    code: '',
    explanation: 'New explanation.',
    complexity: '',
    uml: '',
  },
  note: {
    label: 'Note',
    code: '',
    explanation: 'New note.',
    complexity: '',
    uml: '',
  },
  uml: {
    label: 'UML',
    code: '',
    explanation: '',
    complexity: '',
    uml: 'classDiagram',
  },
};

function mapVariant(row, { includeInstruction = false } = {}) {
  const variant = {
    id: row.id,
    topicId: row.topic_id,
    parentContentId: row.parent_content_id,
    label: row.label,
    code: row.code,
    explanation: row.explanation,
    complexity: row.complexity,
    uml: row.uml,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  if (includeInstruction) {
    variant.instruction = row.instruction;
  }

  return variant;
}

async function getPublicVariantsByTopicId(topicId) {
  const rows = await contentVariantRepository.getVariantsByTopicId(topicId);
  return rows.map((row) => mapVariant(row));
}

async function getAdminVariantsByTopicId(topicId) {
  const rows = await contentVariantRepository.getVariantsByTopicId(topicId);
  return rows.map((row) => mapVariant(row, { includeInstruction: true }));
}

async function createManualBlock({ topicId, type, content = '' }) {
  const blockTemplate = MANUAL_BLOCKS[type];

  if (!blockTemplate) {
    throw createHttpError(400, 'Unsupported block type');
  }

  const rows = await topicRepository.getTopicById(topicId);

  if (!rows.length) {
    throw createHttpError(404, 'Topic not found');
  }

  const [firstRow] = rows;
  const primaryContentRow = rows.find((row) => row.content_id);
  const normalizedContent = typeof content === 'string' ? content : '';

  const block = {
    ...blockTemplate,
  };

  if (normalizedContent.trim()) {
    if (type === 'uml') {
      block.uml = normalizedContent;
    } else if (type === 'explanation' || type === 'note') {
      block.explanation = normalizedContent;
    } else {
      block.code = normalizedContent;
    }
  }

  const row = await contentVariantRepository.createVariant({
    topicId: firstRow.id,
    parentContentId: primaryContentRow?.content_id || null,
    label: block.label,
    instruction: null,
    code: block.code,
    explanation: block.explanation,
    complexity: block.complexity,
    uml: block.uml,
  });

  return mapVariant(row);
}

async function updateVariant(id, payload) {
  const existingVariant = await contentVariantRepository.getVariantById(id);

  if (!existingVariant) {
    throw createHttpError(404, 'Variant not found');
  }

  const label =
    typeof payload.label === 'string' && payload.label.trim()
      ? payload.label.trim()
      : existingVariant.label;

  const row = await contentVariantRepository.updateVariant(id, {
    label,
    code: typeof payload.code === 'string' ? payload.code : '',
    explanation:
      typeof payload.explanation === 'string' ? payload.explanation : '',
    complexity:
      typeof payload.complexity === 'string' ? payload.complexity : '',
    uml: typeof payload.uml === 'string' ? payload.uml : '',
  });

  return mapVariant(row, { includeInstruction: true });
}

async function deleteVariant(id) {
  const deletedVariant = await contentVariantRepository.deleteVariant(id);

  if (!deletedVariant) {
    throw createHttpError(404, 'Variant not found');
  }

  return deletedVariant;
}

module.exports = {
  createManualBlock,
  deleteVariant,
  getAdminVariantsByTopicId,
  getPublicVariantsByTopicId,
  updateVariant,
};
