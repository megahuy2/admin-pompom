const { Voucher, UserVoucher } = require('../models');

/**
 * GET /api/vouchers?page=1&limit=20&search=&is_active=&status=
 * status: 'active' (đang hiệu lực) | 'upcoming' (chưa bắt đầu) | 'expired' (đã hết hạn)
 */
async function getVouchers(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const filter = {};

    if (req.query.search) filter.code = { $regex: req.query.search, $options: 'i' };
    if (req.query.is_active !== undefined) filter.is_active = req.query.is_active === 'true';

    const now = new Date();
    if (req.query.status === 'active') { filter.start_date = { $lte: now }; filter.end_date = { $gte: now }; }
    else if (req.query.status === 'upcoming') { filter.start_date = { $gt: now }; }
    else if (req.query.status === 'expired') { filter.end_date = { $lt: now }; }

    const [vouchers, total] = await Promise.all([
      Voucher.find(filter).skip((page - 1) * limit).limit(limit).sort({ end_date: -1 }),
      Voucher.countDocuments(filter)
    ]);

    res.json({ data: vouchers, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
}

/** GET /api/vouchers/:id (kèm số lượt đã phát cho user) */
async function getVoucherById(req, res) {
  try {
    const voucher = await Voucher.findById(req.params.id);
    if (!voucher) return res.status(404).json({ message: 'Không tìm thấy voucher' });
    const assignedCount = await UserVoucher.countDocuments({ voucher_id: voucher._id });
    res.json({ ...voucher.toObject(), assignedCount });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
}

/** POST /api/vouchers */
async function createVoucher(req, res) {
  try {
    const { code, discount_type, discount_value, start_date, end_date } = req.body;
    if (!code || !discount_type || discount_value == null || !start_date || !end_date) {
      return res.status(400).json({ message: 'Thiếu thông tin bắt buộc (code, loại & giá trị giảm, ngày bắt đầu/kết thúc)' });
    }
    if (new Date(end_date) < new Date(start_date)) {
      return res.status(400).json({ message: 'Ngày kết thúc phải sau ngày bắt đầu' });
    }
    const voucher = await Voucher.create({
      code: String(code).trim().toUpperCase(),
      discount_type,
      discount_value,
      min_order_amount: req.body.min_order_amount || 0,
      max_discount: req.body.max_discount || 0,
      start_date, end_date,
      usage_limit: req.body.usage_limit || 0,
      is_active: req.body.is_active !== undefined ? req.body.is_active : true
    });
    res.status(201).json(voucher);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Mã voucher đã tồn tại' });
    res.status(400).json({ message: 'Không thể tạo voucher', error: err.message });
  }
}

/** PUT /api/vouchers/:id */
async function updateVoucher(req, res) {
  try {
    if (req.body.code) req.body.code = String(req.body.code).trim().toUpperCase();
    if (req.body.start_date && req.body.end_date && new Date(req.body.end_date) < new Date(req.body.start_date)) {
      return res.status(400).json({ message: 'Ngày kết thúc phải sau ngày bắt đầu' });
    }
    const voucher = await Voucher.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!voucher) return res.status(404).json({ message: 'Không tìm thấy voucher' });
    res.json(voucher);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Mã voucher đã tồn tại' });
    res.status(400).json({ message: 'Không thể cập nhật voucher', error: err.message });
  }
}

/**
 * DELETE /api/vouchers/:id
 * Nếu voucher đã được phát cho user (UserVoucher) thì chỉ vô hiệu hóa (is_active=false),
 * ngược lại xóa hẳn — bảo toàn lịch sử.
 */
async function deleteVoucher(req, res) {
  try {
    const assignedCount = await UserVoucher.countDocuments({ voucher_id: req.params.id });
    if (assignedCount > 0) {
      const voucher = await Voucher.findByIdAndUpdate(req.params.id, { is_active: false }, { new: true });
      if (!voucher) return res.status(404).json({ message: 'Không tìm thấy voucher' });
      return res.json({ message: 'Voucher đã phát cho người dùng — đã vô hiệu hóa thay vì xóa', voucher });
    }
    const voucher = await Voucher.findByIdAndDelete(req.params.id);
    if (!voucher) return res.status(404).json({ message: 'Không tìm thấy voucher' });
    res.json({ message: 'Đã xóa voucher' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
}

module.exports = { getVouchers, getVoucherById, createVoucher, updateVoucher, deleteVoucher };
