const crypto = require('crypto');
const env = require('../config/env');

const COOKIE_NAME = 'admin_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 8;

function timingSafeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function signPayload(payload) {
  return crypto
    .createHmac('sha256', env.adminSessionSecret)
    .update(payload)
    .digest('base64url');
}

function createSessionToken() {
  const payload = Buffer.from(
    JSON.stringify({
      username: env.adminUsername,
      expiresAt: Date.now() + SESSION_TTL_MS,
    })
  ).toString('base64url');
  const signature = signPayload(payload);

  return `${payload}.${signature}`;
}

function parseCookies(cookieHeader) {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader.split(';').reduce((cookies, cookiePair) => {
    const [rawName, ...rawValueParts] = cookiePair.trim().split('=');

    if (!rawName) {
      return cookies;
    }

    cookies[rawName] = decodeURIComponent(rawValueParts.join('=') || '');
    return cookies;
  }, {});
}

function verifySessionToken(token) {
  if (!token || !token.includes('.')) {
    return false;
  }

  const [payload, signature] = token.split('.');
  const expectedSignature = signPayload(payload);

  if (!timingSafeEqual(signature, expectedSignature)) {
    return false;
  }

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return (
      session.username === env.adminUsername &&
      Number(session.expiresAt) > Date.now()
    );
  } catch (_error) {
    return false;
  }
}

function authenticateCredentials(username, password) {
  return (
    timingSafeEqual(username, env.adminUsername) &&
    timingSafeEqual(password, env.adminPassword)
  );
}

function getSessionFromRequest(req) {
  const cookies = parseCookies(req.headers.cookie);
  return cookies[COOKIE_NAME] || '';
}

function setSessionCookie(res) {
  res.cookie(COOKIE_NAME, createSessionToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.nodeEnv === 'production',
    maxAge: SESSION_TTL_MS,
    path: '/',
  });
}

function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.nodeEnv === 'production',
    path: '/',
  });
}

function isAuthenticated(req) {
  return verifySessionToken(getSessionFromRequest(req));
}

module.exports = {
  authenticateCredentials,
  clearSessionCookie,
  isAuthenticated,
  setSessionCookie,
};
