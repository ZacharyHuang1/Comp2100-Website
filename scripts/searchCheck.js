const { pool, formatDatabaseError } = require('../src/db/pool');
const searchIndexService = require('../src/services/searchIndexService');

async function main() {
  const status = await searchIndexService.checkSearchIndex();

  console.log(JSON.stringify(status, null, 2));
}

main()
  .catch((error) => {
    console.error(`Search index check failed: ${formatDatabaseError(error)}`);
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
