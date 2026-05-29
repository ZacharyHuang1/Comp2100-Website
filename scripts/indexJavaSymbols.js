const { pool } = require('../src/db');
const symbolIndexService = require('../src/services/symbolIndexService');

async function main() {
  const result = await symbolIndexService.indexAllJavaContents();

  console.log('Java symbol indexing complete');
  console.log(`Contents scanned: ${result.contentsScanned}`);
  console.log(`Contents indexed: ${result.contentsIndexed}`);
  console.log(`Symbols indexed: ${result.symbolsIndexed}`);
}

main()
  .catch((error) => {
    console.error('Java symbol indexing failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
