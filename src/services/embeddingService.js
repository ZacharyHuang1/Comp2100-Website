const env = require('../config/env');

function isEmbeddingConfigured() {
  return Boolean(env.searchSemanticEnabled && env.openaiApiKey);
}

function getEmbeddingModel() {
  return env.embeddingModel || 'text-embedding-3-small';
}

function normalizeEmbeddingInput(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 24000);
}

async function createEmbedding(input) {
  if (!isEmbeddingConfigured()) {
    return null;
  }

  const normalizedInput = normalizeEmbeddingInput(input);

  if (!normalizedInput) {
    return null;
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: getEmbeddingModel(),
      input: normalizedInput,
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload?.error?.message || 'Embedding request failed';
    throw new Error(message);
  }

  return payload?.data?.[0]?.embedding || null;
}

function buildEmbeddingText(document) {
  return [
    document.title,
    document.path,
    document.symbol_name,
    document.content_preview,
    document.content_text,
  ]
    .filter(Boolean)
    .join('\n\n');
}

module.exports = {
  buildEmbeddingText,
  createEmbedding,
  getEmbeddingModel,
  isEmbeddingConfigured,
};
