const express = require('express');
const documentationController = require('../controllers/documentationController');
const requireAdminAuth = require('../middleware/requireAdminAuth');
const requireUserAuth = require('../middleware/requireUserAuth');

const router = express.Router();

function requireDocumentationManager(req, res, next) {
  if (
    req.currentUser?.role === 'manager' ||
    req.currentUser?.role === 'root_manager'
  ) {
    return next();
  }

  return res.status(403).json({ message: 'Manager permission required.' });
}

router.use('/documentation', requireUserAuth);

router.get('/documentation/spaces', documentationController.getSpaces);
router.get('/documentation/spaces/:id', documentationController.getSpace);
router.post(
  '/documentation/spaces',
  requireDocumentationManager,
  documentationController.createSpace
);
router.put(
  '/documentation/spaces/:id',
  requireDocumentationManager,
  documentationController.updateSpace
);
router.delete(
  '/documentation/spaces/:id',
  requireDocumentationManager,
  documentationController.deleteSpace
);
router.post(
  '/documentation/spaces/:id/archive',
  requireDocumentationManager,
  documentationController.archiveSpace
);

router.get('/documentation/pages', documentationController.getPages);
router.get('/documentation/pages/:id', documentationController.getPage);
router.post(
  '/documentation/pages',
  requireDocumentationManager,
  documentationController.createPage
);
router.put(
  '/documentation/pages/:id',
  requireDocumentationManager,
  documentationController.updatePage
);
router.delete(
  '/documentation/pages/:id',
  requireDocumentationManager,
  documentationController.deletePage
);
router.post(
  '/documentation/pages/:id/archive',
  requireDocumentationManager,
  documentationController.archivePage
);

router.use('/admin/documentation', requireAdminAuth);
router.get('/admin/documentation/spaces', documentationController.getSpaces);
router.post('/admin/documentation/spaces', documentationController.createSpace);
router.get('/admin/documentation/spaces/:id', documentationController.getSpace);
router.put('/admin/documentation/spaces/:id', documentationController.updateSpace);
router.delete('/admin/documentation/spaces/:id', documentationController.deleteSpace);
router.post(
  '/admin/documentation/spaces/:id/archive',
  documentationController.archiveSpace
);
router.get('/admin/documentation/pages', documentationController.getPages);
router.post('/admin/documentation/pages', documentationController.createPage);
router.get('/admin/documentation/pages/:id', documentationController.getPage);
router.put('/admin/documentation/pages/:id', documentationController.updatePage);
router.delete('/admin/documentation/pages/:id', documentationController.deletePage);
router.post(
  '/admin/documentation/pages/:id/archive',
  documentationController.archivePage
);

module.exports = router;
