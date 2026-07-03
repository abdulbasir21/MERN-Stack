const express = require('express');
const router = express.Router();
const { getPublicStats, getRecentResolved } = require('../controllers/publicController');

// No auth required
router.get('/stats', getPublicStats);
router.get('/recent-resolved', getRecentResolved);

module.exports = router;
