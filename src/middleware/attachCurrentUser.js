const authService = require('../services/authService');

async function attachCurrentUser(req, _res, next) {
  try {
    const session = await authService.getSessionFromRequest(req);

    if (session) {
      req.currentUser = session.user;
      req.currentSessionId = session.id;
    }

    return next();
  } catch (_error) {
    return next();
  }
}

module.exports = attachCurrentUser;
