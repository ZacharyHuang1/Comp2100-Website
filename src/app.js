const cors = require('cors');
const express = require('express');
const healthRoutes = require('./routes/healthRoutes');
const topicRoutes = require('./routes/topicRoutes');
const searchRoutes = require('./routes/searchRoutes');
const adminRoutes = require('./routes/adminRoutes');
const adminUserRoutes = require('./routes/adminUserRoutes');
const authRoutes = require('./routes/authRoutes');
const explorerRoutes = require('./routes/explorerRoutes');
const publicEditRoutes = require('./routes/publicEditRoutes');
const todoRoutes = require('./routes/todoRoutes');
const documentationRoutes = require('./routes/documentationRoutes');
const gitSimulatorRoutes = require('./routes/gitSimulatorRoutes');
const attachCurrentUser = require('./middleware/attachCurrentUser');
const env = require('./config/env');
const { sanitizeResponsePayload } = require('./services/responseFormatter');

const app = express();

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || env.corsOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS origin not allowed: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  })
);
app.use(express.json());
app.use(attachCurrentUser);
app.use((req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = (payload) => originalJson(sanitizeResponsePayload(payload));

  next();
});
app.use(healthRoutes);
app.use(explorerRoutes);
app.use(topicRoutes);
app.use(searchRoutes);
app.use(authRoutes);
app.use(publicEditRoutes);
app.use(todoRoutes);
app.use(gitSimulatorRoutes);
app.use(documentationRoutes);
app.use(adminUserRoutes);
app.use(adminRoutes);

app.use((error, _req, res, _next) => {
  console.error(error);

  if (error.statusCode) {
    return res.status(error.statusCode).json({ message: error.message });
  }

  if (error.code === 'ECONNREFUSED') {
    return res.status(503).json({
      message:
        'Database connection failed. Start PostgreSQL and verify DATABASE_URL in .env.',
    });
  }

  if (error.code === '3D000') {
    return res.status(503).json({
      message: 'Database does not exist. Run "npm run db:setup" first.',
    });
  }

  if (
    error.code === '28000' ||
    error.code === '28P01' ||
    (error.code === '42704' && error.message && error.message.includes('role'))
  ) {
    return res.status(503).json({
      message:
        'Database credentials are invalid. Update DATABASE_URL in .env to use a valid local PostgreSQL user.',
    });
  }

  return res.status(500).json({ message: 'Internal server error' });
});

module.exports = app;
