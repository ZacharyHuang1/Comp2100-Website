const fs = require('fs');
const path = require('path');
const env = require('../config/env');
const { pool, formatDatabaseError } = require('./pool');

const migrationsDir = path.resolve(__dirname, '../../migrations');

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function getAppliedMigrationNames() {
  const result = await pool.query(
    'SELECT filename FROM schema_migrations ORDER BY filename ASC'
  );

  return new Set(result.rows.map((row) => row.filename));
}

async function applyMigration(filename) {
  const migrationPath = path.join(migrationsDir, filename);
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log(`Applying migration: ${filename}`);
  await pool.query('BEGIN');

  try {
    await pool.query(sql);
    await pool.query(
      'INSERT INTO schema_migrations (filename) VALUES ($1)',
      [filename]
    );
    await pool.query('COMMIT');
    console.log(`Applied migration: ${filename}`);
  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  }
}

async function runMigrations() {
  console.log(`Using database: ${env.databaseName} as ${env.databaseUser}`);
  await ensureMigrationsTable();

  const appliedMigrations = await getAppliedMigrationNames();
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((filename) => filename.endsWith('.sql'))
    .sort();

  for (const filename of migrationFiles) {
    if (appliedMigrations.has(filename)) {
      console.log(`Skipping already applied migration: ${filename}`);
      continue;
    }

    await applyMigration(filename);
  }

  console.log('Migrations complete');
}

if (require.main === module) {
  runMigrations()
    .catch((error) => {
      console.error(`Migration failed: ${formatDatabaseError(error)}`);
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await pool.end();
    });
}

module.exports = {
  runMigrations,
};
