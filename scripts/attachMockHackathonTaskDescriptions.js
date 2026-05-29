#!/usr/bin/env node

const { pool, query } = require('../src/db');
const catalogue = require('../src/data/mockHackathonTaskDescriptions.json');

const EXPECTED = { DS: 48, PD: 40, DP: 40 };

function getTaskIdFromTitle(title) {
  const match = String(title || '').match(/^(DS|PD|DP)\d{2}_/);
  return match ? match[0].slice(0, 4) : null;
}

function formatDescription(entry) {
  return [
    `Feature: ${entry.feature}`,
    '',
    `Task: ${entry.likelyHackathonTask}`,
  ].join('\n').trim();
}

function countByPrefix(items, prefix) {
  return items.filter((item) => item.startsWith(prefix)).length;
}

async function getMockHackathonContents() {
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

async function attachDescriptions() {
  const entries = catalogue.entries || {};
  const taskIds = Object.keys(entries);
  const rows = await getMockHackathonContents();
  const rowsByTaskId = new Map();
  const duplicates = [];

  for (const row of rows) {
    const taskId = getTaskIdFromTitle(row.topic_title);

    if (!taskId) {
      continue;
    }

    if (rowsByTaskId.has(taskId)) {
      duplicates.push(taskId);
      continue;
    }

    rowsByTaskId.set(taskId, row);
  }

  const summary = {
    updated: [],
    unchanged: [],
    missing: [],
    duplicates,
  };

  for (const taskId of taskIds) {
    const row = rowsByTaskId.get(taskId);

    if (!row) {
      summary.missing.push(taskId);
      continue;
    }

    const nextDescription = formatDescription(entries[taskId]);
    const existingDescription = String(row.task_description || '').trim();

    if (existingDescription === nextDescription) {
      summary.unchanged.push(taskId);
      continue;
    }

    await query(
      'UPDATE contents SET task_description = $2 WHERE id = $1',
      [row.content_id, nextDescription]
    );
    summary.updated.push(taskId);
  }

  const attached = [...summary.updated, ...summary.unchanged];
  const counts = {
    DS: countByPrefix(attached, 'DS'),
    PD: countByPrefix(attached, 'PD'),
    DP: countByPrefix(attached, 'DP'),
  };

  console.log(`DS task descriptions attached: ${counts.DS}/${EXPECTED.DS}`);
  console.log(`PD task descriptions attached: ${counts.PD}/${EXPECTED.PD}`);
  console.log(`DP task descriptions attached: ${counts.DP}/${EXPECTED.DP}`);
  console.log(`Total task descriptions attached: ${attached.length}/128`);
  console.log(`Updated: ${summary.updated.length}`);
  console.log(`Unchanged: ${summary.unchanged.length}`);

  if (summary.missing.length) {
    console.error(`Missing topics: ${summary.missing.join(', ')}`);
  }

  if (summary.duplicates.length) {
    console.error(`Duplicate topic prefixes: ${summary.duplicates.join(', ')}`);
  }

  if (
    counts.DS !== EXPECTED.DS ||
    counts.PD !== EXPECTED.PD ||
    counts.DP !== EXPECTED.DP ||
    summary.missing.length ||
    summary.duplicates.length
  ) {
    process.exitCode = 1;
  }
}

attachDescriptions()
  .catch((error) => {
    console.error('Attach mock task descriptions failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
