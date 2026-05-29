const { pool, formatDatabaseError } = require('../src/db/pool');
const searchIndexService = require('../src/services/searchIndexService');

async function main() {
  const embed = !process.argv.includes('--no-embeddings');
  const result = await searchIndexService.rebuildSearchIndex({ embed });

  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error(`Search reindex failed: ${formatDatabaseError(error)}`);
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
