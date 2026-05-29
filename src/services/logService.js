const fs = require('fs/promises');
const path = require('path');

const logsRoot = path.resolve(__dirname, '../../logs');

function sanitizeFileSegment(value) {
  return String(value || 'anonymous')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'anonymous';
}

function summarizeResult(result) {
  if (!result || !result.found) {
    return 'No results found';
  }

  const items = Array.isArray(result.results)
    ? result.results
    : result.data
      ? [result.data]
      : [];

  if (!items.length) {
    return 'No results found';
  }

  return items.map((item) => `- ${item.title}`).join('\n');
}

async function appendSearchLog(userId, queryText, result) {
  const dateStamp = new Date().toISOString().slice(0, 10);
  const filename = `${dateStamp}-${sanitizeFileSegment(userId)}.md`;
  const filePath = path.join(logsRoot, filename);

  const logEntry = [
    '## Query',
    '',
    queryText || '',
    '',
    '## Result',
    '',
    summarizeResult(result),
    '',
  ].join('\n');

  await fs.mkdir(logsRoot, { recursive: true });
  await fs.appendFile(filePath, `${logEntry}\n`, 'utf8');
}

module.exports = {
  appendSearchLog,
};
