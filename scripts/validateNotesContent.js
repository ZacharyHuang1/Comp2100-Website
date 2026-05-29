#!/usr/bin/env node

const fs = require('fs/promises');
const path = require('path');
const { pool } = require('../src/db');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const NOTE_DIRECTORIES = ['content/notes', 'content/reference-notes'];
const SOURCE_MARKER_PREFIX = 'NOTE_SOURCE:';

async function listMarkdownFiles(directory) {
  const absoluteDirectory = path.join(PROJECT_ROOT, directory);
  const entries = await fs.readdir(absoluteDirectory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(absoluteDirectory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await listMarkdownFiles(path.relative(PROJECT_ROOT, entryPath))));
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      files.push(entryPath);
    }
  }

  return files.sort((left, right) => left.localeCompare(right));
}

async function getSourceFiles() {
  const files = [];

  for (const directory of NOTE_DIRECTORIES) {
    try {
      files.push(...(await listMarkdownFiles(directory)));
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  return files.map((filePath) =>
    path.relative(PROJECT_ROOT, filePath).replace(/\\/g, '/')
  );
}

async function main() {
  const files = await getSourceFiles();
  const failures = [];

  const categoryResult = await pool.query(
    "SELECT id, name, slug FROM categories WHERE lower(slug) = 'notes' ORDER BY id ASC LIMIT 1"
  );
  const notesCategory = categoryResult.rows[0] || null;

  if (!notesCategory) {
    failures.push('Notes category is missing');
  }

  const rowsBySource = new Map();

  if (notesCategory) {
    const importedResult = await pool.query(
      `
        SELECT
          t.id AS topic_id,
          t.title,
          t.category_id,
          ct.id AS content_id,
          ct.query
        FROM topics t
        INNER JOIN contents ct ON ct.topic_id = t.id
        WHERE t.category_id = $1
          AND ct.query LIKE $2
      `,
      [notesCategory.id, `%${SOURCE_MARKER_PREFIX}%`]
    );

    for (const row of importedResult.rows) {
      const match = String(row.query || '').match(
        new RegExp(`${SOURCE_MARKER_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^\\s]+)`)
      );

      if (match) {
        rowsBySource.set(match[1], row);
      }
    }
  }

  for (const source of files) {
    if (!rowsBySource.has(source)) {
      failures.push(`${source} is missing from Notes`);
    }
  }

  const duplicateResult = notesCategory
    ? await pool.query(
        `
          SELECT source, COUNT(*)::int AS count
          FROM (
            SELECT substring(ct.query from $2) AS source
            FROM topics t
            INNER JOIN contents ct ON ct.topic_id = t.id
            WHERE t.category_id = $1
              AND ct.query LIKE $3
          ) imported
          GROUP BY source
          HAVING COUNT(*) > 1
        `,
        [
          notesCategory.id,
          `${SOURCE_MARKER_PREFIX}([^[:space:]]+)`,
          `%${SOURCE_MARKER_PREFIX}%`,
        ]
      )
    : { rows: [] };

  for (const row of duplicateResult.rows) {
    failures.push(`${row.source} has ${row.count} imported rows`);
  }

  const summary = {
    notesCategory: notesCategory
      ? {
          id: Number(notesCategory.id),
          name: notesCategory.name,
          slug: notesCategory.slug,
        }
      : null,
    sourceFiles: files.length,
    importedFiles: rowsBySource.size,
    missingFiles: failures.filter((failure) => failure.includes(' is missing ')).length,
    duplicateSources: duplicateResult.rows.length,
    ok: failures.length === 0,
  };

  console.log(JSON.stringify(summary, null, 2));

  if (failures.length) {
    console.error(failures.join('\n'));
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
