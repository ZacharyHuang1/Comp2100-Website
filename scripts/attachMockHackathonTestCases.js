#!/usr/bin/env node

const fs = require('fs/promises');
const path = require('path');
const { pool, query } = require('../src/db');
const contentRepository = require('../src/repositories/contentRepository');
const contentVariantRepository = require('../src/repositories/contentVariantRepository');
const symbolIndexService = require('../src/services/symbolIndexService');
const { tasks } = require('./generateMockHackathonCodebase');

const ROOT = path.join(__dirname, '..');

function fileNameForTask(task) {
  return `${task.className}.java`;
}

function normalizeSearchText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

async function findImplementationContent(task) {
  const result = await query(
    `
      SELECT
        t.id AS topic_id,
        t.title AS topic_title,
        c.id AS category_id,
        c.name AS category_name,
        ct.id AS content_id,
        ct.query,
        ct.code,
        ct.explanation,
        ct.complexity,
        ct.uml
      FROM topics t
      INNER JOIN categories c ON c.id = t.category_id
      INNER JOIN contents ct ON ct.topic_id = t.id
      WHERE lower(t.title) = lower($1)
      ORDER BY
        CASE WHEN c.name = $2 THEN 0 ELSE 1 END,
        t.id ASC,
        ct.id ASC
      LIMIT 1
    `,
    [fileNameForTask(task), task.category]
  );

  return result.rows[0] || null;
}

async function findExistingTestCaseVariant(topicId) {
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
      WHERE topic_id = $1 AND lower(label) = 'test case'
      ORDER BY id ASC
      LIMIT 1
    `,
    [topicId]
  );

  return result.rows[0] || null;
}

async function updateContentMetadata(task, contentRow) {
  const existingQuery = normalizeSearchText(contentRow.query);
  const searchableQuery = normalizeSearchText(
    [
      existingQuery,
      task.taskId,
      task.title,
      task.feature,
      task.likelyHackathonTask,
      task.className,
      'Mock hackathon',
      'Software Architecture and UML Description',
      'Test Case',
      `${task.className}Test`,
      'JUnit 4',
    ].join(' ')
  );
  const explanation = [
    task.explanation,
    `A Test Case block is attached to this implementation topic with JUnit 4 coverage for the ${task.taskId} catalogue behavior.`,
  ].join('\n\n');

  const updatedContent = await contentRepository.updateContent(contentRow.content_id, {
    topicId: contentRow.topic_id,
    query: searchableQuery,
    code: contentRow.code,
    explanation,
    complexity: task.complexity || contentRow.complexity || 'Software Architecture and UML Description is not specified.',
    uml: task.uml || '',
  });

  if (updatedContent) {
    await symbolIndexService.indexContent(updatedContent);
  }

  return updatedContent;
}

async function upsertTestCaseVariant(task, contentRow) {
  const testCode = await fs.readFile(task.testPath, 'utf8');
  const variantPayload = {
    topicId: contentRow.topic_id,
    parentContentId: contentRow.content_id,
    label: 'Test Case',
    instruction: null,
    code: testCode,
    explanation: `JUnit 4 test case coverage for ${task.taskId}: ${task.title}.`,
    complexity: 'Test complexity depends on the scenario; these tests use small fixed-size inputs.',
    uml: '',
  };
  const existingVariant = await findExistingTestCaseVariant(contentRow.topic_id);

  if (existingVariant) {
    const updated = await contentVariantRepository.updateVariant(existingVariant.id, {
      label: variantPayload.label,
      code: variantPayload.code,
      explanation: variantPayload.explanation,
      complexity: variantPayload.complexity,
      uml: variantPayload.uml,
    });

    return {
      action: 'updated',
      id: updated.id,
    };
  }

  const created = await contentVariantRepository.createVariant(variantPayload);

  return {
    action: 'created',
    id: created.id,
  };
}

async function attachTestCases() {
  const results = [];

  for (const task of tasks) {
    const contentRow = await findImplementationContent(task);

    if (!contentRow) {
      results.push({
        taskId: task.taskId,
        className: task.className,
        status: 'missing_topic',
      });
      continue;
    }

    await updateContentMetadata(task, contentRow);
    const variantResult = await upsertTestCaseVariant(task, contentRow);

    results.push({
      taskId: task.taskId,
      className: task.className,
      topicId: contentRow.topic_id,
      contentId: contentRow.content_id,
      variantId: variantResult.id,
      status: variantResult.action,
    });
  }

  return {
    tasks: tasks.length,
    attached: results.filter((result) => result.status !== 'missing_topic').length,
    missing: results.filter((result) => result.status === 'missing_topic').length,
    results,
  };
}

async function main() {
  const result = await attachTestCases();
  console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error(error.message || error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await pool.end();
    });
}

module.exports = {
  attachTestCases,
};
