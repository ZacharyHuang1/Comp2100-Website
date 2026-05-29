const dotenv = require('dotenv');
const os = require('os');

dotenv.config();

const defaultDatabaseUser = process.env.DB_USER || os.userInfo().username;
const defaultDatabaseName = process.env.DB_NAME || 'code_knowledge_db';
const defaultDatabaseHost = process.env.DB_HOST || 'localhost';
const defaultDatabasePort = Number(process.env.DB_PORT) || 5432;
const defaultDatabaseUrl = `postgresql://${defaultDatabaseUser}@${defaultDatabaseHost}:${defaultDatabasePort}/${defaultDatabaseName}`;
const configuredDatabaseUrl = process.env.DATABASE_URL || defaultDatabaseUrl;

function parseDatabaseUrl(databaseUrl) {
  try {
    const parsed = new URL(databaseUrl);
    return {
      user: decodeURIComponent(parsed.username) || defaultDatabaseUser,
      name: parsed.pathname.replace(/^\//, '') || defaultDatabaseName,
      host: parsed.hostname || defaultDatabaseHost,
      port: Number(parsed.port) || defaultDatabasePort,
    };
  } catch {
    return {
      user: defaultDatabaseUser,
      name: defaultDatabaseName,
      host: defaultDatabaseHost,
      port: defaultDatabasePort,
    };
  }
}

const parsedDatabase = parseDatabaseUrl(configuredDatabaseUrl);

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 3000,
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3001')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  databaseUser: parsedDatabase.user,
  databaseName: parsedDatabase.name,
  databaseHost: parsedDatabase.host,
  databasePort: parsedDatabase.port,
  databaseUrl: configuredDatabaseUrl,
  adminUsername: process.env.ADMIN_USERNAME || 'zach',
  adminPassword: process.env.ADMIN_PASSWORD || 'hcx1114',
  adminSessionSecret:
    process.env.ADMIN_SESSION_SECRET || 'development-admin-session-secret',
  publicDocumentEditing: process.env.PUBLIC_DOCUMENT_EDITING !== 'false',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  embeddingModel: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
  searchSemanticEnabled: process.env.SEARCH_SEMANTIC_ENABLED !== 'false',
};

module.exports = env;
