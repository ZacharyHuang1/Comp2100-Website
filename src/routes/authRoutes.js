const express = require('express');
const authController = require('../controllers/authController');
const requireUserAuth = require('../middleware/requireUserAuth');

const router = express.Router();

router.post('/auth/login', authController.login);
router.post('/auth/logout', authController.logout);
router.get('/auth/me', authController.me);
router.post('/auth/change-password', requireUserAuth, authController.changePassword);
router.get('/auth/sessions', requireUserAuth, authController.getSessions);
router.delete('/auth/sessions/:id', requireUserAuth, authController.revokeSession);

module.exports = router;
