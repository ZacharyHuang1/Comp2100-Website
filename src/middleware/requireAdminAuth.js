const adminAuthService = require('../services/adminAuthService');
const userService = require('../services/userService');

async function requireAdminAuth(req, res, next) {
  if (
    req.currentUser &&
    (req.currentUser.role === 'manager' || req.currentUser.role === 'root_manager')
  ) {
    return next();
  }

  if (adminAuthService.isAuthenticated(req)) {
    req.currentUser = await userService.getRootUser();
    return next();
  }

  return res.status(401).json({ message: 'Admin authentication required' });
}

module.exports = requireAdminAuth;
