function sanitizeResponsePayload(payload) {
  if (Array.isArray(payload)) {
    return payload.map(sanitizeResponsePayload);
  }

  if (!payload || typeof payload !== 'object') {
    return payload;
  }

  if (payload instanceof Date) {
    return payload.toISOString();
  }

  const sanitizedPayload = {};

  for (const [key, value] of Object.entries(payload)) {
    if (
      key === 'source' ||
      key === 'password_hash' ||
      key === 'passwordHash' ||
      key === 'token_hash' ||
      key === 'tokenHash'
    ) {
      continue;
    }

    sanitizedPayload[key] = sanitizeResponsePayload(value);
  }

  return sanitizedPayload;
}

module.exports = {
  sanitizeResponsePayload,
};
