const { Order, OrderItem, OrderStatusHistory, Payment, Product, User } = require('../models');

// Các trạng thái hợp lệ, lấy đúng theo enum trong order.models.js
const ORDER_STATUSES = ['pending', 'paid', 'preparing', 'shipping', 'delivered', 'returned', 'cancelled'];
const TERMINAL_STATUSES = ['delivered', 'returned', 'cancelled'];
// Các cột cho phép sắp xếp (whitelist tránh injection)
const SORTABLE = ['created_at', 'final_amount', 'order_number', 'status'];

// Sinh mã đơn duy nhất cho đơn tạo từ admin
function genOrderNumber() {
  return 'PP-ADM-' + Date.now().toString(36).toUpperCase();
}

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
      if (req.query.to) {
        const to = new Date(req.query.to);
        to.setHours(23, 59, 59, 999); // trọn ngày 'to'
        filter.created_at.$lte = to;
      }
    }

    // Sắp xếp (whitelist cột) — mặc định created_at giảm dần
    const sortBy = SORTABLE.includes(req.query.sortBy) ? req.query.sortBy : 'created_at';
    const sortDir = req.query.sortDir === 'asc' ? 1 : -1;

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('user_id', 'full_name email')
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ [sortBy]: sortDir }),
      Order.countDocuments(filter)
    ]);

    // Đếm số dòng hàng của mỗi đơn (hiển thị "x sản phẩm")
    const ids = orders.map((o) => o._id);
    const itemCounts = await OrderItem.aggregate([
      { $match: { order_id: { $in: ids } } },
      { $group: { _id: '$order_id', count: { $sum: 1 }, qty: { $sum: '$quantity' } } }
    ]);
    const countMap = {};
    itemCounts.forEach((c) => { countMap[c._id.toString()] = { lines: c.count, qty: c.qty }; });
    const data = orders.map((o) => ({
      ...o.toObject(),
      item_count: countMap[o._id.toString()]?.lines || 0,
      item_qty: countMap[o._id.toString()]?.qty || 0
    }));

    res.json({ data, total, page, totalPages: Math.ceil(total / limit) });
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

/**
 * POST /api/orders
 * Tạo đơn hàng thủ công từ Admin.
 * Body: { user_id?, items:[{product_id, quantity}], payment_method, shipping_fee?, discount_amount?, note? }
 * Giá lấy từ Product (sale_price nếu có), tự tính total/final, tạo OrderItems + lịch sử trạng thái.
 */
async function createOrder(req, res) {
  try {
    const { user_id, items, payment_method } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Đơn hàng phải có ít nhất 1 sản phẩm' });
    }
    if (!['COD', 'VNPay', 'MoMo', 'VISA'].includes(payment_method)) {
      return res.status(400).json({ message: 'Phương thức thanh toán không hợp lệ' });
    }

    // Lấy giá thật từ Product
    const productIds = items.map((it) => it.product_id);
    const products = await Product.find({ _id: { $in: productIds } }).select('price sale_price name');
    const priceMap = {};
    products.forEach((p) => { priceMap[p._id.toString()] = p.sale_price || p.price; });

    const lineItems = [];
    for (const it of items) {
      const unit = priceMap[String(it.product_id)];
      if (unit == null) return res.status(400).json({ message: 'Sản phẩm không tồn tại trong đơn' });
      const qty = Math.max(1, parseInt(it.quantity) || 1);
      lineItems.push({ product_id: it.product_id, quantity: qty, price: unit });
    }

    const totalAmount = lineItems.reduce((s, it) => s + it.price * it.quantity, 0);
    const shippingFee = Math.max(0, parseInt(req.body.shipping_fee) || 0);
    const discount = Math.max(0, parseInt(req.body.discount_amount) || 0);
    const finalAmount = Math.max(0, totalAmount + shippingFee - discount);

    const order = await Order.create({
      order_number: genOrderNumber(),
      user_id: user_id || null,
      total_amount: totalAmount,
      shipping_fee: shippingFee,
      discount_amount: discount,
      final_amount: finalAmount,
      status: 'pending',
      payment_method,
      payment_status: 'pending',
      note: req.body.note || ''
    });

    await OrderItem.insertMany(lineItems.map((it) => ({ ...it, order_id: order._id })));
    await OrderStatusHistory.create({ order_id: order._id, status: 'pending', note: 'Tạo đơn từ Admin' });

    const populated = await Order.findById(order._id).populate('user_id', 'full_name email');
    res.status(201).json({ message: 'Đã tạo đơn hàng', order: populated });
  } catch (err) {
    res.status(400).json({ message: 'Không thể tạo đơn hàng', error: err.message });
  }
}

/**
 * PUT /api/orders/bulk-status
 * Đổi trạng thái hàng loạt. Body: { ids:[], status, note? }
 * Bỏ qua các đơn đã ở trạng thái cuối (không ghi đè).
 */
async function bulkUpdateStatus(req, res) {
  try {
    const { ids, status, note } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'Chưa chọn đơn hàng nào' });
    }
    if (!ORDER_STATUSES.includes(status)) {
      return res.status(400).json({ message: 'Trạng thái không hợp lệ', allowed: ORDER_STATUSES });
    }

    const orders = await Order.find({ _id: { $in: ids } });
    let updated = 0; const skipped = [];
    for (const order of orders) {
      if (TERMINAL_STATUSES.includes(order.status)) { skipped.push(order.order_number); continue; }
      order.status = status;
      await order.save();
      await OrderStatusHistory.create({ order_id: order._id, status, note: note || 'Cập nhật hàng loạt' });
      updated++;
    }
    res.json({ message: `Đã cập nhật ${updated} đơn`, updated, skipped });
  } catch (err) {
    res.status(400).json({ message: 'Không thể cập nhật hàng loạt', error: err.message });
  }
}

/**
 * POST /api/orders/import
 * Nhập đơn từ file (mỗi dòng = 1 đơn 1 sản phẩm).
 * Body: { rows: [{ customer_email?, product_sku, quantity, payment_method? }] }
 * Trả về số đơn tạo được + danh sách lỗi từng dòng.
 */
async function importOrders(req, res) {
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ message: 'Không có dòng dữ liệu để nhập' });
    }

    const created = []; const errors = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      try {
        const product = await Product.findOne({ sku: String(r.product_sku || '').trim() }).select('price sale_price');
        if (!product) { errors.push({ row: i + 1, message: `Không tìm thấy SKU "${r.product_sku}"` }); continue; }
        const qty = Math.max(1, parseInt(r.quantity) || 1);
        const unit = product.sale_price || product.price;

        let userId = null;
        if (r.customer_email) {
          const user = await User.findOne({ email: String(r.customer_email).trim().toLowerCase() }).select('_id');
          if (user) userId = user._id;
        }
        const method = ['COD', 'VNPay', 'MoMo', 'VISA'].includes(r.payment_method) ? r.payment_method : 'COD';

        const order = await Order.create({
          order_number: genOrderNumber() + '-' + i,
          user_id: userId,
          total_amount: unit * qty,
          shipping_fee: 0, discount_amount: 0,
          final_amount: unit * qty,
          status: 'pending', payment_method: method, payment_status: 'pending',
          note: 'Nhập từ file'
        });
        await OrderItem.create({ order_id: order._id, product_id: product._id, quantity: qty, price: unit });
        await OrderStatusHistory.create({ order_id: order._id, status: 'pending', note: 'Nhập từ file' });
        created.push(order.order_number);
      } catch (e) {
        errors.push({ row: i + 1, message: e.message });
      }
    }
    res.status(201).json({ message: `Đã nhập ${created.length}/${rows.length} đơn`, created: created.length, errors });
  } catch (err) {
    res.status(400).json({ message: 'Không thể nhập đơn', error: err.message });
  }
}

module.exports = {
  getOrders,
  getOrderById,
  updateOrderStatus,
  confirmCodPayment,
  createOrder,
  bulkUpdateStatus,
  importOrders
};
