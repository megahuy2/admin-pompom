const express = require('express');
const router = express.Router();
const {
  getVouchers, getVoucherById, createVoucher, updateVoucher, deleteVoucher
} = require('../controllers/voucher.controller');
const { verifyToken, requireAdmin } = require('../middleware/auth.middleware');

router.use(verifyToken, requireAdmin);

router.get('/', getVouchers);
router.get('/:id', getVoucherById);
router.post('/', createVoucher);
router.put('/:id', updateVoucher);
router.delete('/:id', deleteVoucher);

module.exports = router;
