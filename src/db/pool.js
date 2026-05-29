const { Pool } = require('pg');
const env = require('../config/env');

const pool = new Pool({
  connectionString: env.databaseUrl,
});

pool.on('error', (error) => {
  console.error(
    `[db] Unexpected PostgreSQL client error for ${env.databaseUrl}`,
    error
  );
});

function query(text, params) {
  return pool.query(text, params);
}

async function checkDatabaseConnection() {
  const client = await pool.connect();

  try {
    await client.query('SELECT 1');
  } finally {
    client.release();
  }
}

function formatDatabaseError(error) {
  if (!error) {
    return 'Unknown PostgreSQL error';
  }

  if (error.code === 'ECONNREFUSED') {
    return `Could not connect to PostgreSQL at ${env.databaseHost}:${env.databasePort}. Start PostgreSQL and verify DATABASE_URL in .env.`;
  }

  if (error.code === '3D000') {
    return `Database "${env.databaseName}" does not exist. Run "npm run db:setup" to create it and apply migrations.`;
  }

  if (error.code === '28000' || error.code === '28P01') {
    return `PostgreSQL rejected the credentials for user "${env.databaseUser}". Update DATABASE_URL in .env to use a valid local role.`;
  }

  if (error.code === '42704' && error.message && error.message.includes('role')) {
    return `PostgreSQL role "${env.databaseUser}" does not exist. Update DATABASE_URL in .env to use your local macOS/PostgreSQL username.`;
  }

  return error.message || 'Unknown PostgreSQL error';
}

module.exports = {
  pool,
  query,
  checkDatabaseConnection,
  formatDatabaseError,
};
