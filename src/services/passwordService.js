const crypto = require('crypto');
const { promisify } = require('util');
const { createHttpError } = require('./categoryService');

const scryptAsync = promisify(crypto.scrypt);
const HASH_PREFIX = 'scrypt';
const KEY_LENGTH = 64;

function normalizePassword(password) {
  return typeof password === 'string' ? password : '';
}

function assertPasswordStrength(password) {
  if (normalizePassword(password).length < 8) {
    throw createHttpError(400, 'Password must be at least 8 characters.');
  }
}

async function hashPassword(password, options = {}) {
  const normalizedPassword = normalizePassword(password);

  if (!options.allowLegacyShort) {
    assertPasswordStrength(normalizedPassword);
  }

  const salt = crypto.randomBytes(16).toString('base64url');
  const derivedKey = await scryptAsync(normalizedPassword, salt, KEY_LENGTH);

  return `${HASH_PREFIX}:1:${salt}:${derivedKey.toString('base64url')}`;
}

async function verifyPassword(password, passwordHash) {
  const normalizedPassword = normalizePassword(password);

  if (!passwordHash || typeof passwordHash !== 'string') {
    return false;
  }

  const [prefix, version, salt, storedHash] = passwordHash.split(':');

  if (prefix !== HASH_PREFIX || version !== '1' || !salt || !storedHash) {
    return false;
  }

  const derivedKey = await scryptAsync(normalizedPassword, salt, KEY_LENGTH);
  const storedBuffer = Buffer.from(storedHash, 'base64url');

  if (storedBuffer.length !== derivedKey.length) {
    return false;
  }

  return crypto.timingSafeEqual(storedBuffer, derivedKey);
}

module.exports = {
  assertPasswordStrength,
  hashPassword,
  verifyPassword,
};
