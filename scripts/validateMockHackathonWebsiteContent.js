#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { query, pool } = require('../src/db');
const { tasks } = require('./generateMockHackathonCodebase');

const ROOT = path.join(__dirname, '..');

function expectedDescription(task) {
  return [`Feature: ${task.feature}`, '', `Task: ${task.likelyHackathonTask}`].join('\n').trim();
}

function hasOldDescriptionFields(value) {
  return /(Suggested classes|Possible API|Core structure|Test cases|Notes|Likely hackathon task|Task ID|ID:)/i.test(value);
}

async function rowFor(task) {
  const result = await query(
    `
      SELECT
        t.id AS topic_id,
        ct.id AS content_id,
        ct.task_description,
        ct.explanation,
        ct.complexity,
        ct.uml,
        cv.id AS test_variant_id,
        cv.code AS test_code
      FROM topics t
      INNER JOIN categories c ON c.id = t.category_id
      LEFT JOIN contents ct ON ct.topic_id = t.id
      LEFT JOIN content_variants cv
        ON cv.topic_id = t.id AND cv.label = 'Test Case'
      WHERE lower(t.title) = lower($1)
        AND c.name = $2
      ORDER BY t.id ASC
      LIMIT 1
    `,
    [`${task.className}.java`, task.category]
  );
  return result.rows[0] || null;
}

async function main() {
  const results = [];
  const failures = [];

  for (const task of tasks) {
    const row = await rowFor(task);
    const taskFailures = [];

    if (!row?.topic_id) taskFailures.push('topic missing from database');
    if (String(row?.task_description || '').trim() !== expectedDescription(task)) {
      taskFailures.push('task_description is not exactly Feature + Task');
    }
    if (hasOldDescriptionFields(String(row?.task_description || ''))) {
      taskFailures.push('task_description contains old catalogue fields');
    }
    if (!String(row?.explanation || '').trim()) taskFailures.push('explanation is empty');
    if (!String(row?.complexity || '').includes('Software Architecture and UML Description')) {
      taskFailures.push('software architecture/UML description is missing');
    }
    if (!String(row?.uml || '').trim().startsWith('classDiagram')) {
      taskFailures.push('UML classDiagram is missing');
    }
    if (!row?.test_variant_id) taskFailures.push('Test Case block missing');
    if (row?.test_code && !/^\s*package\s+hackathon\s*;/m.test(row.test_code)) {
      taskFailures.push('Test Case block missing package hackathon');
    }
    if (row?.test_code && /^\s*package\s+Mock_hackathon\./m.test(row.test_code)) {
      taskFailures.push('Test Case block uses old Mock_hackathon package');
    }

    results.push({
      taskId: task.id,
      className: task.className,
      ok: taskFailures.length === 0,
      failures: taskFailures,
    });
    for (const failure of taskFailures) {
      failures.push(`${task.id} ${task.className}: ${failure}`);
    }
  }

  const report = {
    checked: results.length,
    passed: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
    failures,
  };

  fs.writeFileSync(
    path.join(ROOT, 'imports', 'app', 'src', 'Mock_hackathon', 'MockHackathonWebsiteContentValidationReport.json'),
    JSON.stringify(report, null, 2),
    'utf8'
  );

  await pool.end();

  if (failures.length) {
    console.error(`Mock_hackathon website content validation failed: ${failures.length} issue(s)`);
    for (const failure of failures.slice(0, 200)) {
      console.error(`- ${failure}`);
    }
    if (failures.length > 200) {
      console.error(`...and ${failures.length - 200} more issue(s).`);
    }
    process.exit(1);
  }

  console.log(`Mock_hackathon website content validation passed: ${report.passed}/${report.checked}`);
}

if (require.main === module) {
  main().catch(async (error) => {
    console.error(error);
    await pool.end();
    process.exit(1);
  });
}
