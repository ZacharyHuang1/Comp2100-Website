const express = require('express');
const gitSimulatorController = require('../controllers/gitSimulatorController');
const requireUserAuth = require('../middleware/requireUserAuth');

const router = express.Router();

router.use('/git-simulator', requireUserAuth);

router.get('/git-simulator/session', gitSimulatorController.getSession);
router.post('/git-simulator/reset', gitSimulatorController.reset);
router.post('/git-simulator/clear-history', gitSimulatorController.clearHistory);
router.post('/git-simulator/commit', gitSimulatorController.commit);
router.post('/git-simulator/push', gitSimulatorController.push);
router.post('/git-simulator/pull', gitSimulatorController.pull);
router.post('/git-simulator/create-branch', gitSimulatorController.createBranch);
router.post('/git-simulator/checkout', gitSimulatorController.checkout);
router.post('/git-simulator/merge', gitSimulatorController.merge);
router.post('/git-simulator/undo', gitSimulatorController.undo);
router.get('/git-simulator/events', gitSimulatorController.getEvents);

module.exports = router;
