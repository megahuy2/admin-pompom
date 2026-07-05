const express = require('express');
const router = express.Router();
const {
  getOrders,
  getOrderById,
  updateOrderStatus,
  confirmCodPayment,
  createOrder,
  bulkUpdateStatus,
  importOrders
} = require('../controllers/order.controller');
const { verifyToken, requireAdmin } = require('../middleware/auth.middleware');

router.use(verifyToken, requireAdmin);

router.get('/', getOrders);
router.post('/', createOrder);
router.put('/bulk-status', bulkUpdateStatus);   // đặt trước '/:id' để không bị nuốt route
router.post('/import', importOrders);
router.get('/:id', getOrderById);
router.put('/:id/status', updateOrderStatus);
router.put('/:id/confirm-payment', confirmCodPayment);

module.exports = router;
