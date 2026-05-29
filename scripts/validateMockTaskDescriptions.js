#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { pool, query } = require('../src/db');
const catalogue = require('../src/data/mockHackathonTaskDescriptions.json');

const ROOT = path.join(__dirname, '..');
const MOCK_SRC_ROOT = path.join(ROOT, 'imports', 'app', 'src', 'Mock_hackathon');
const MOCK_TEST_ROOT = path.join(ROOT, 'imports', 'app', 'test', 'Mock_hackathon');
const EXPECTED = { DS: 48, PD: 40, DP: 40 };

function getTaskIdFromTitle(title) {
  const match = String(title || '').match(/^(DS|PD|DP)\d{2}_/);
  return match ? match[0].slice(0, 4) : null;
}

function countByPrefix(items, prefix) {
  return items.filter((item) => item.startsWith(prefix)).length;
}

function collectJavaFiles(root) {
  if (!fs.existsSync(root)) {
    return [];
  }

  const files = [];
  const entries = fs.readdirSync(root, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectJavaFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.java')) {
      files.push(fullPath);
    }
  }

  return files;
}

function javaFilesContainTaskDescriptions() {
  const files = [...collectJavaFiles(MOCK_SRC_ROOT), ...collectJavaFiles(MOCK_TEST_ROOT)];

  return files.filter((file) => {
    const source = fs.readFileSync(file, 'utf8');
    return /Task Description|\*\*ID:\*\*\s*(DS|PD|DP)\d{2}/.test(source);
  });
}

async function getMockHackathonRows() {
  const result = await query(`
    WITH RECURSIVE category_paths AS (
      SELECT
        id,
        name,
        parent_id,
        name::text AS path
      FROM categories
      WHERE parent_id IS NULL

      UNION ALL

      SELECT
        c.id,
        c.name,
        c.parent_id,
        category_paths.path || '/' || c.name
      FROM categories c
      INNER JOIN category_paths ON c.parent_id = category_paths.id
    ),
    ranked_contents AS (
      SELECT
        t.id AS topic_id,
        t.title AS topic_title,
        ct.id AS content_id,
        ct.task_description,
        category_paths.path,
        ROW_NUMBER() OVER (
          PARTITION BY t.id
          ORDER BY ct.created_at ASC, ct.id ASC
        ) AS row_number
      FROM topics t
      INNER JOIN category_paths ON category_paths.id = t.category_id
      INNER JOIN contents ct ON ct.topic_id = t.id
      WHERE category_paths.path LIKE '%/src/Mock_hackathon/%'
        AND t.title ~ '^(DS|PD|DP)[0-9]{2}_'
    )
    SELECT *
    FROM ranked_contents
    WHERE row_number = 1
    ORDER BY topic_title ASC
  `);

  return result.rows;
}

async function countNonMockTaskDescriptions() {
  const result = await query(`
    WITH RECURSIVE category_paths AS (
      SELECT
        id,
        name,
        parent_id,
        name::text AS path
      FROM categories
      WHERE parent_id IS NULL

      UNION ALL

      SELECT
        c.id,
        c.name,
        c.parent_id,
        category_paths.path || '/' || c.name
      FROM categories c
      INNER JOIN category_paths ON c.parent_id = category_paths.id
    )
    SELECT COUNT(*)::int AS count
    FROM topics t
    INNER JOIN category_paths ON category_paths.id = t.category_id
    INNER JOIN contents ct ON ct.topic_id = t.id
    WHERE COALESCE(NULLIF(BTRIM(ct.task_description), ''), '') <> ''
      AND category_paths.path NOT LIKE '%Mock_hackathon%'
  `);

  return Number(result.rows[0]?.count || 0);
}

async function validate() {
  const entries = catalogue.entries || {};
  const expectedIds = new Set(Object.keys(entries));
  const rows = await getMockHackathonRows();
  const presentIds = [];
  const failures = [];
  const forbiddenLabels = [
    '**ID:**',
    '**Task:**',
    '**Feature:**',
    '**Likely hackathon task:**',
    '**Core structure',
    '**Suggested classes:**',
    '**Possible API:**',
    '**Test cases:**',
    '**Notes:**',
    'Core structure / pattern:',
    'Suggested classes:',
    'Possible API:',
    'Test cases:',
    'Notes:',
  ];

  for (const row of rows) {
    const taskId = getTaskIdFromTitle(row.topic_title);

    if (!taskId || !expectedIds.has(taskId)) {
      continue;
    }

    const description = String(row.task_description || '').trim();
    const expectedDescription = [
      `Feature: ${entries[taskId].feature}`,
      '',
      `Task: ${entries[taskId].likelyHackathonTask}`,
    ].join('\n').trim();

    if (!description) {
      failures.push(`${taskId} is missing task_description`);
      continue;
    }

    if (description !== expectedDescription) {
      failures.push(`${taskId} task_description is not simplified to Feature and Task only`);
    }

    for (const forbidden of forbiddenLabels) {
      if (description.includes(forbidden)) {
        failures.push(`${taskId} task_description still contains forbidden field ${forbidden}`);
        break;
      }
    }

    presentIds.push(taskId);
  }

  for (const taskId of expectedIds) {
    if (!presentIds.includes(taskId)) {
      failures.push(`${taskId} topic/content was not found`);
    }
  }

  const nonMockCount = await countNonMockTaskDescriptions();

  if (nonMockCount > 0) {
    failures.push(`${nonMockCount} non-Mock_hackathon contents have task_description`);
  }

  const pollutedJavaFiles = javaFilesContainTaskDescriptions();

  if (pollutedJavaFiles.length) {
    failures.push(
      `Task descriptions were found in Java files: ${pollutedJavaFiles
        .map((file) => path.relative(ROOT, file))
        .join(', ')}`
    );
  }

  const uniquePresentIds = [...new Set(presentIds)];
  const counts = {
    DS: countByPrefix(uniquePresentIds, 'DS'),
    PD: countByPrefix(uniquePresentIds, 'PD'),
    DP: countByPrefix(uniquePresentIds, 'DP'),
  };

  console.log(`DS task descriptions: ${counts.DS}/${EXPECTED.DS}`);
  console.log(`PD task descriptions: ${counts.PD}/${EXPECTED.PD}`);
  console.log(`DP task descriptions: ${counts.DP}/${EXPECTED.DP}`);
  console.log(`Total task descriptions: ${uniquePresentIds.length}/128`);

  if (failures.length) {
    console.error('Validation failures:');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
  } else {
    console.log('Mock_hackathon task description validation passed.');
  }
}

validate()
  .catch((error) => {
    console.error('Validate mock task descriptions failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
