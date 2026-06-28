const { Order, OrderItem, OrderStatusHistory, Payment } = require('../models');

// Các trạng thái hợp lệ, lấy đúng theo enum trong order.models.js
const ORDER_STATUSES = ['pending', 'paid', 'preparing', 'shipping', 'delivered', 'cancelled'];

/**
 * GET /api/orders?page=1&limit=20&status=&from=&to=&search=
 * Lọc theo trạng thái và khoảng ngày (created_at), tìm theo order_number
 */
async function getOrders(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const filter = {};

    if (req.query.status) filter.status = req.query.status;
    if (req.query.search) filter.order_number = { $regex: req.query.search, $options: 'i' };

    // Lọc theo khoảng ngày tạo đơn
    if (req.query.from || req.query.to) {
      filter.created_at = {};
      if (req.query.from) filter.created_at.$gte = new Date(req.query.from);
      if (req.query.to) filter.created_at.$lte = new Date(req.query.to);
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('user_id', 'full_name email')
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ created_at: -1 }),
      Order.countDocuments(filter)
    ]);

    res.json({ data: orders, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
}

/**
 * GET /api/orders/:id (gồm items, lịch sử trạng thái, thanh toán)
 */
async function getOrderById(req, res) {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user_id', 'full_name email phone_number')
      .populate('address_id');
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });

    const [items, history, payment] = await Promise.all([
      OrderItem.find({ order_id: order._id }).populate('product_id', 'name'),
      OrderStatusHistory.find({ order_id: order._id }).sort({ created_at: 1 }),
      Payment.findOne({ order_id: order._id })
    ]);

    res.json({ ...order.toObject(), items, history, payment });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
}

/**
 * PUT /api/orders/:id/status
 * Đổi trạng thái đơn, tự động ghi một dòng vào order_status_history
 * Body: { status, note }
 */
async function updateOrderStatus(req, res) {
  try {
    const { status, note } = req.body;
    if (!ORDER_STATUSES.includes(status)) {
      return res.status(400).json({ message: 'Trạng thái không hợp lệ', allowed: ORDER_STATUSES });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });

    // Không cho đổi trạng thái khi đơn đã ở trạng thái cuối (đã giao / đã hủy)
    if (['delivered', 'cancelled'].includes(order.status)) {
      return res.status(400).json({
        message: `Đơn đã ở trạng thái cuối "${order.status}", không thể đổi tiếp`
      });
    }

    order.status = status;
    await order.save();

    // Ghi lịch sử trạng thái (ORDERS 1-N ORDER_STATUS_HISTORY)
    await OrderStatusHistory.create({ order_id: order._id, status, note });

    res.json({ message: 'Đã cập nhật trạng thái đơn hàng', order });
  } catch (err) {
    res.status(400).json({ message: 'Không thể cập nhật trạng thái', error: err.message });
  }
}

/**
 * PUT /api/orders/:id/confirm-payment
 * Xác nhận thanh toán COD: đánh dấu đơn đã thanh toán và cập nhật bản ghi Payment
 */
async function confirmCodPayment(req, res) {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });

    if (order.payment_method !== 'COD') {
      return res.status(400).json({ message: 'Đơn hàng này không phải thanh toán COD' });
    }
    if (order.payment_status === 'paid') {
      return res.status(400).json({ message: 'Đơn hàng đã được xác nhận thanh toán trước đó' });
    }

    order.payment_status = 'paid';
    await order.save();

    // Cập nhật (hoặc tạo mới) bản ghi Payment tương ứng — ORDERS 1-1 PAYMENTS
    const payment = await Payment.findOneAndUpdate(
      { order_id: order._id },
      {
        order_id: order._id,
        amount: order.final_amount,
        status: 'success',
        payment_method: 'COD',
        paid_at: new Date()
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json({ message: 'Đã xác nhận thanh toán COD', order, payment });
  } catch (err) {
    res.status(400).json({ message: 'Không thể xác nhận thanh toán', error: err.message });
  }
}

module.exports = {
  getOrders,
  getOrderById,
  updateOrderStatus,
  confirmCodPayment
};
