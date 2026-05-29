const { Client } = require('pg');
const env = require('../config/env');
const { pool, formatDatabaseError } = require('./pool');
const { runMigrations } = require('./runMigrations');

function parseDatabaseUrl(connectionString) {
  const databaseUrl = new URL(connectionString);

  return {
    user: decodeURIComponent(databaseUrl.username),
    password: databaseUrl.password
      ? decodeURIComponent(databaseUrl.password)
      : undefined,
    host: databaseUrl.hostname,
    port: Number(databaseUrl.port) || 5432,
    database: databaseUrl.pathname.replace(/^\//, ''),
    ssl:
      databaseUrl.searchParams.get('sslmode') === 'require'
        ? { rejectUnauthorized: false }
        : undefined,
  };
}

function getAdminDatabaseCandidates(targetConfig) {
  return ['postgres', 'template1', targetConfig.user].filter(Boolean);
}

async function connectToAdminDatabase(targetConfig) {
  const adminDatabases = getAdminDatabaseCandidates(targetConfig);
  let lastError;

  for (const database of adminDatabases) {
    const client = new Client({
      user: targetConfig.user,
      password: targetConfig.password,
      host: targetConfig.host,
      port: targetConfig.port,
      database,
      ssl: targetConfig.ssl,
    });

    try {
      await client.connect();
      console.log(`Connected to admin database "${database}"`);
      return client;
    } catch (error) {
      lastError = error;
      console.warn(`Unable to connect to admin database "${database}": ${error.message}`);
      await client.end().catch(() => {});
    }
  }

  throw lastError;
}

async function createDatabaseIfMissing() {
  const targetConfig = parseDatabaseUrl(env.databaseUrl);
  const adminClient = await connectToAdminDatabase(targetConfig);

  try {
    const existingDatabase = await adminClient.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [targetConfig.database]
    );

    if (existingDatabase.rowCount > 0) {
      console.log(`Database "${targetConfig.database}" already exists`);
      return;
    }

    const identifier = `"${targetConfig.database.replace(/"/g, '""')}"`;
    await adminClient.query(`CREATE DATABASE ${identifier}`);
    console.log(`Created database "${targetConfig.database}"`);
  } finally {
    await adminClient.end();
  }
}

async function validateTables() {
  const result = await pool.query(
    `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ANY($1::text[])
      ORDER BY table_name ASC
    `,
    [['categories', 'topics', 'contents']]
  );

  const foundTables = result.rows.map((row) => row.table_name);
  const missingTables = ['categories', 'topics', 'contents'].filter(
    (table) => !foundTables.includes(table)
  );

  if (missingTables.length > 0) {
    throw new Error(`Missing expected tables: ${missingTables.join(', ')}`);
  }

  console.log(`Confirmed tables exist: ${foundTables.join(', ')}`);
}

async function setupDatabase() {
  console.log(`Preparing database setup for ${env.databaseUrl}`);
  await createDatabaseIfMissing();
  await runMigrations();
  await validateTables();
  console.log('Database setup complete');
}

if (require.main === module) {
  setupDatabase()
    .catch((error) => {
      console.error(`Database setup failed: ${formatDatabaseError(error)}`);
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await pool.end();
    });
}

module.exports = {
  setupDatabase,
};
