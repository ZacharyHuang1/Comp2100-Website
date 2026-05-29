const express = require('express');
const publicEditController = require('../controllers/publicEditController');
const requireUserAuth = require('../middleware/requireUserAuth');

const router = express.Router();

router.get(
  '/document-editing',
  requireUserAuth,
  publicEditController.getEditingStatus
);
router.put('/contents/:id', requireUserAuth, publicEditController.updateContent);
router.post(
  '/topics/:id/blocks',
  requireUserAuth,
  publicEditController.createBlock
);
router.put('/variants/:id', requireUserAuth, publicEditController.updateVariant);
router.delete(
  '/variants/:id',
  requireUserAuth,
  publicEditController.deleteVariant
);
router.put('/blocks/:id', requireUserAuth, publicEditController.updateVariant);
router.delete('/blocks/:id', requireUserAuth, publicEditController.deleteVariant);

module.exports = router;
