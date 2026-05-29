const express = require('express');
const multer = require('multer');
const adminController = require('../controllers/adminController');
const requireAdminAuth = require('../middleware/requireAdminAuth');

const router = express.Router();

const javaUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (!file.originalname.toLowerCase().endsWith('.java')) {
      return cb(new Error('Only .java files are supported'));
    }

    return cb(null, true);
  },
}).single('file');

function handleJavaUpload(req, res, next) {
  javaUpload(req, res, (error) => {
    if (error) {
      return res.status(400).json({ message: error.message });
    }

    return next();
  });
}

router.post('/admin/login', adminController.login);
router.post('/admin/logout', adminController.logout);
router.get('/admin/me', adminController.me);

router.get('/admin/categories', requireAdminAuth, adminController.getCategories);
router.post('/admin/categories', requireAdminAuth, adminController.createCategory);
router.put('/admin/categories/:id', requireAdminAuth, adminController.updateCategory);
router.delete(
  '/admin/categories/:id',
  requireAdminAuth,
  adminController.deleteCategory
);

router.get('/admin/topics', requireAdminAuth, adminController.getTopics);
router.post('/admin/topics', requireAdminAuth, adminController.createTopic);
router.put('/admin/topics/:id', requireAdminAuth, adminController.updateTopic);
router.delete('/admin/topics/:id', requireAdminAuth, adminController.deleteTopic);

router.get('/admin/contents', requireAdminAuth, adminController.getContents);
router.get('/admin/contents/:id', requireAdminAuth, adminController.getContent);
router.post('/admin/contents', requireAdminAuth, adminController.createContent);
router.put('/admin/contents/:id', requireAdminAuth, adminController.updateContent);
router.delete(
  '/admin/contents/:id',
  requireAdminAuth,
  adminController.deleteContent
);

router.get(
  '/admin/topics/:id/variants',
  requireAdminAuth,
  adminController.getTopicVariants
);
router.put('/admin/variants/:id', requireAdminAuth, adminController.updateVariant);
router.delete(
  '/admin/variants/:id',
  requireAdminAuth,
  adminController.deleteVariant
);

router.post(
  '/admin/upload-java',
  requireAdminAuth,
  handleJavaUpload,
  adminController.uploadJava
);
router.post(
  '/admin/import-codebase',
  requireAdminAuth,
  adminController.importCodebase
);

module.exports = router;
