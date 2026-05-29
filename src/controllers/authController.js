const authService = require('../services/authService');

async function login(req, res, next) {
  try {
    const user = await authService.login({
      username: req.body.username,
      password: req.body.password,
      rememberDevice: Boolean(req.body.rememberDevice),
      req,
      res,
    });

    return res.json({ authenticated: true, user });
  } catch (error) {
    return next(error);
  }
}

async function logout(req, res, next) {
  try {
    await authService.logout(req, res);
    return res.json({ authenticated: false });
  } catch (error) {
    return next(error);
  }
}

async function me(req, res) {
  if (!req.currentUser) {
    return res.json({ authenticated: false });
  }

  return res.json({ authenticated: true, user: req.currentUser });
}

async function changePassword(req, res, next) {
  try {
    await authService.changePassword({
      req,
      user: req.currentUser,
      currentPassword: req.body.currentPassword,
      newPassword: req.body.newPassword,
    });

    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
}

async function getSessions(req, res, next) {
  try {
    return res.json(
      await authService.getSessionsForUser(req.currentUser, req.currentSessionId)
    );
  } catch (error) {
    return next(error);
  }
}

async function revokeSession(req, res, next) {
  try {
    return res.json(
      await authService.revokeOwnSession({
        user: req.currentUser,
        sessionId: req.params.id,
      })
    );
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  changePassword,
  getSessions,
  login,
  logout,
  me,
  revokeSession,
};
