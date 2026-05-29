const express = require('express');
const { searchContent } = require('../controllers/searchController');
const requireUserAuth = require('../middleware/requireUserAuth');

const router = express.Router();

router.get('/search', requireUserAuth, searchContent);

module.exports = router;
