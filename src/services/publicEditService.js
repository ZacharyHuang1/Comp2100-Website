const env = require('../config/env');
const adminRepository = require('../repositories/adminRepository');
const contentVariantRepository = require('../repositories/contentVariantRepository');
const adminService = require('./adminService');
const contentVariantService = require('./contentVariantService');
const { createHttpError } = require('./categoryService');

function assertPublicEditingEnabled() {
  if (!env.publicDocumentEditing) {
    throw createHttpError(403, 'Public document editing is disabled');
  }
}

function normalizePositiveId(value, fieldName) {
  const normalizedValue = Number(value);

  if (!Number.isInteger(normalizedValue) || normalizedValue <= 0) {
    throw createHttpError(400, `${fieldName} must be a positive integer`);
  }

  return normalizedValue;
}

function stringOrExisting(value, existingValue) {
  return typeof value === 'string' ? value : existingValue || '';
}

async function updateContent(id, payload = {}) {
  assertPublicEditingEnabled();

  const contentId = normalizePositiveId(id, 'content id');
  const existingContent = await adminRepository.getContentById(contentId);

  if (!existingContent) {
    throw createHttpError(404, 'Content not found');
  }

  if (
    existingContent.visibility !== 'public' ||
    existingContent.topic_visibility !== 'public'
  ) {
    throw createHttpError(404, 'Content not found');
  }

  return adminService.updateContent(contentId, {
    topicId: existingContent.topic_id,
    title: stringOrExisting(payload.title, existingContent.topic_title),
    categoryId: payload.categoryId || existingContent.category_id,
    query: stringOrExisting(
      payload.query,
      existingContent.query || existingContent.topic_title
    ),
    code: stringOrExisting(payload.code, existingContent.code),
    explanation: stringOrExisting(
      payload.explanation,
      existingContent.explanation
    ),
    complexity: stringOrExisting(payload.complexity, existingContent.complexity),
    uml: stringOrExisting(payload.uml, existingContent.uml),
  });
}

async function updateVariant(id, payload = {}) {
  assertPublicEditingEnabled();

  const variantId = normalizePositiveId(id, 'variant id');
  const existingVariant = await contentVariantRepository.getVariantById(
    variantId
  );

  if (!existingVariant) {
    throw createHttpError(404, 'Variant not found');
  }

  if (existingVariant.topic_visibility !== 'public') {
    throw createHttpError(404, 'Variant not found');
  }

  return contentVariantService.updateVariant(variantId, {
    label: stringOrExisting(payload.label, existingVariant.label),
    code: stringOrExisting(payload.code, existingVariant.code),
    explanation: stringOrExisting(
      payload.explanation,
      existingVariant.explanation
    ),
    complexity: stringOrExisting(payload.complexity, existingVariant.complexity),
    uml: stringOrExisting(payload.uml, existingVariant.uml),
  });
}

async function createBlock(topicId, payload = {}) {
  assertPublicEditingEnabled();

  const normalizedTopicId = normalizePositiveId(topicId, 'topic id');
  const topic = await adminRepository.getTopicById(normalizedTopicId);

  if (!topic || topic.visibility !== 'public') {
    throw createHttpError(404, 'Topic not found');
  }

  return contentVariantService.createManualBlock({
    topicId: normalizedTopicId,
    type: payload.type,
    content: payload.content,
  });
}

async function deleteVariant(id) {
  assertPublicEditingEnabled();

  const variantId = normalizePositiveId(id, 'variant id');
  const existingVariant = await contentVariantRepository.getVariantById(
    variantId
  );

  if (!existingVariant || existingVariant.topic_visibility !== 'public') {
    throw createHttpError(404, 'Variant not found');
  }

  return contentVariantService.deleteVariant(variantId);
}

module.exports = {
  createBlock,
  deleteVariant,
  updateContent,
  updateVariant,
};
