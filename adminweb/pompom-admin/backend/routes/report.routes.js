const express = require('express');
const router = express.Router();
const {
  getRevenueReport,
  getTopProducts,
  getUserBehaviorReport
} = require('../controllers/report.controller');
const { verifyToken, requireAdmin } = require('../middleware/auth.middleware');

router.use(verifyToken, requireAdmin);

router.get('/revenue', getRevenueReport);
router.get('/top-products', getTopProducts);
router.get('/user-behavior', getUserBehaviorReport);

module.exports = router;
