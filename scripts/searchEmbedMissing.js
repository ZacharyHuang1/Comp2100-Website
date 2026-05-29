const { pool, formatDatabaseError } = require('../src/db/pool');
const searchIndexService = require('../src/services/searchIndexService');

function getLimit() {
  const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
  const limit = Number(limitArg?.split('=')[1]);

  return Number.isInteger(limit) && limit > 0 ? limit : 50;
}

async function main() {
  const result = await searchIndexService.embedMissingDocuments({
    limit: getLimit(),
  });

  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error(`Embedding missing search documents failed: ${formatDatabaseError(error)}`);
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
