const app = require('./app');
const env = require('./config/env');
const { checkDatabaseConnection, formatDatabaseError } = require('./db/pool');

async function startServer() {
  try {
    await checkDatabaseConnection();
    console.log(
      `PostgreSQL connection established: ${env.databaseName} as ${env.databaseUser}`
    );
  } catch (error) {
    console.error(`PostgreSQL connection failed: ${formatDatabaseError(error)}`);
    console.error(error);
  }

  app.listen(env.port, () => {
    console.log(`Server listening on port ${env.port}`);
  });
}

startServer();
