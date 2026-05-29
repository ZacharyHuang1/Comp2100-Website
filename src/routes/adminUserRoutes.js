const express = require('express');
const adminUserController = require('../controllers/adminUserController');
const requireAdminAuth = require('../middleware/requireAdminAuth');

const router = express.Router();

router.get('/admin/users', requireAdminAuth, adminUserController.getUsers);
router.post('/admin/users', requireAdminAuth, adminUserController.createUser);
router.get('/admin/users/:id', requireAdminAuth, adminUserController.getUser);
router.put('/admin/users/:id', requireAdminAuth, adminUserController.updateUser);
router.delete('/admin/users/:id', requireAdminAuth, adminUserController.deleteUser);
router.post(
  '/admin/users/:id/grant-manager',
  requireAdminAuth,
  adminUserController.grantManager
);
router.post(
  '/admin/users/:id/revoke-manager',
  requireAdminAuth,
  adminUserController.revokeManager
);
router.post(
  '/admin/users/:id/disable',
  requireAdminAuth,
  adminUserController.disableUser
);
router.post('/admin/users/:id/enable', requireAdminAuth, adminUserController.enableUser);
router.post(
  '/admin/users/:id/reset-password',
  requireAdminAuth,
  adminUserController.resetPassword
);

module.exports = router;
