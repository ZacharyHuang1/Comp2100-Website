#!/usr/bin/env node

const { pool } = require('../src/db');
const {
  DEFAULT_CODEBASE_NAME,
  DEFAULT_IMPORT_PATH,
  importJavaCodebase,
} = require('../src/services/codebaseImportService');

function getArgValue(args, name, fallback) {
  const index = args.indexOf(name);

  if (index === -1 || index === args.length - 1) {
    return fallback;
  }

  return args[index + 1];
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const importPath = getArgValue(args, '--path', DEFAULT_IMPORT_PATH);
  const codebaseName = getArgValue(args, '--name', DEFAULT_CODEBASE_NAME);
  const result = await importJavaCodebase({
    path: importPath,
    name: codebaseName,
    dryRun,
  });

  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
