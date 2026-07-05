const { User, UserAddress, Order, Notification } = require('../models');

// Trạng thái tài khoản hợp lệ, lấy đúng theo enum trong user.models.js
const USER_STATUSES = ['active', 'locked'];

/**
 * GET /api/users?page=1&limit=20&search=&role=&status=
 * Tìm theo họ tên hoặc email, lọc theo role/status
 */
async function getUsers(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const filter = {};

    if (req.query.role) filter.role = req.query.role;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.search) {
      const regex = { $regex: req.query.search, $options: 'i' };
      filter.$or = [{ full_name: regex }, { email: regex }];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password_hash')
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ created_at: -1 })
        .lean(),
      User.countDocuments(filter)
    ]);

    // Thống kê đơn hàng mỗi khách: số đơn (mọi trạng thái) + tổng chi tiêu (đơn đã giao)
    const ids = users.map((u) => u._id);
    const stats = await Order.aggregate([
      { $match: { user_id: { $in: ids } } },
      {
        $group: {
          _id: '$user_id',
          order_count: { $sum: 1 },
          total_spent: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, '$final_amount', 0] } }
        }
      }
    ]);
    const statMap = {};
    stats.forEach((s) => { statMap[s._id.toString()] = s; });
    users.forEach((u) => {
      const s = statMap[u._id.toString()];
      u.order_count = s?.order_count || 0;
      u.total_spent = s?.total_spent || 0;
    });

    res.json({ data: users, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
}

/**
 * GET /api/users/:id (kèm địa chỉ + lịch sử đơn hàng)
 */
async function getUserById(req, res) {
  try {
    const user = await User.findById(req.params.id).select('-password_hash');
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng' });

    const [addresses, orders] = await Promise.all([
      UserAddress.find({ user_id: user._id }),
      Order.find({ user_id: user._id })
        .select('order_number status payment_status final_amount created_at')
        .sort({ created_at: -1 })
    ]);

    res.json({ ...user.toObject(), addresses, orders });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
}

/**
 * PUT /api/users/:id/status
 * Khóa/mở khóa tài khoản. Body: { status: 'active' | 'locked' }
 */
async function updateUserStatus(req, res) {
  try {
    const { status } = req.body;
    if (!USER_STATUSES.includes(status)) {
      return res.status(400).json({ message: 'Trạng thái không hợp lệ', allowed: USER_STATUSES });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng' });

    // Không cho khóa tài khoản admin (tránh tự khóa mất quyền truy cập)
    if (user.role === 'admin' && status === 'locked') {
      return res.status(400).json({ message: 'Không thể khóa tài khoản admin' });
    }

    user.status = status;
    await user.save();

    const message = status === 'locked' ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản';
    res.json({ message, user: { id: user._id, full_name: user.full_name, status: user.status } });
  } catch (err) {
    res.status(400).json({ message: 'Không thể cập nhật trạng thái', error: err.message });
  }
}

/**
 * POST /api/users/:id/notifications
 * Gửi thông báo tới người dùng (tạo bản ghi Notification)
 * Body: { title, message, type, image_url, action_url, reference_id }
 */
async function sendNotification(req, res) {
  try {
    const { title, message, type, image_url, action_url, reference_id } = req.body;
    if (!title) return res.status(400).json({ message: 'Vui lòng nhập tiêu đề thông báo' });

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng' });

    const notification = await Notification.create({
      user_id: user._id,
      title,
      message,
      type,
      image_url,
      action_url,
      reference_id
    });

    res.status(201).json({ message: 'Đã gửi thông báo', notification });
  } catch (err) {
    res.status(400).json({ message: 'Không thể gửi thông báo', error: err.message });
  }
}

module.exports = {
  getUsers,
  getUserById,
  updateUserStatus,
  sendNotification
};
