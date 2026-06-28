const express = require('express');
const router = express.Router();
const { getDashboardSummary } = require('../controllers/dashboard.controller');
const { verifyToken, requireAdmin } = require('../middleware/auth.middleware');

router.use(verifyToken, requireAdmin);

router.get('/summary', getDashboardSummary);

module.exports = router;
