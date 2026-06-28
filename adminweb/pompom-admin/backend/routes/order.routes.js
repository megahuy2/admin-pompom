const express = require('express');
const router = express.Router();
const {
  getOrders,
  getOrderById,
  updateOrderStatus,
  confirmCodPayment
} = require('../controllers/order.controller');
const { verifyToken, requireAdmin } = require('../middleware/auth.middleware');

router.use(verifyToken, requireAdmin);

router.get('/', getOrders);
router.get('/:id', getOrderById);
router.put('/:id/status', updateOrderStatus);
router.put('/:id/confirm-payment', confirmCodPayment);

module.exports = router;
