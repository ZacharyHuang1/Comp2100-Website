const { query } = require('../db');

async function replaceSymbolsForContent({ contentId, topicId, symbols }) {
  await query('DELETE FROM content_symbols WHERE content_id = $1', [contentId]);

  if (!symbols.length) {
    return [];
  }

  const values = [];
  const placeholders = symbols.map((symbol, index) => {
    const offset = index * 8;

    values.push(
      contentId,
      topicId,
      symbol.visibility || 'package',
      symbol.kind,
      symbol.name,
      symbol.signature,
      symbol.snippet || symbol.signature,
      symbol.lineNumber || null
    );

    return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8})`;
  });

  const result = await query(
    `
      INSERT INTO content_symbols (
        content_id,
        topic_id,
        visibility,
        kind,
        name,
        signature,
        snippet,
        line_number
      )
      VALUES ${placeholders.join(', ')}
      RETURNING
        id,
        content_id,
        topic_id,
        visibility,
        kind,
        name,
        signature,
        snippet,
        line_number,
        created_at,
        updated_at
    `,
    values
  );

  return result.rows;
}

async function getJavaContents() {
  const result = await query(`
    SELECT
      ct.id,
      ct.topic_id,
      ct.code,
      t.title AS topic_title
    FROM contents ct
    INNER JOIN topics t ON t.id = ct.topic_id
    WHERE
      ct.code IS NOT NULL
      AND (
        t.title ILIKE '%.java'
        OR ct.code ~* '\\m(class|interface|enum|record)\\M'
      )
    ORDER BY ct.id ASC
  `);

  return result.rows;
}

async function countSymbols() {
  const result = await query('SELECT COUNT(*)::int AS count FROM content_symbols');
  return result.rows[0].count;
}

module.exports = {
  countSymbols,
  getJavaContents,
  replaceSymbolsForContent,
};
