const { Reel, ConsultationRequest } = require('../models');

const REEL_SOURCES = ['instagram', 'facebook', 'tiktok', 'youtube'];
const CONSULT_STATUSES = ['pending', 'contacted', 'done', 'cancelled'];

/* =============================== REELS =============================== */

/** GET /api/admin/reels?page=1&limit=20&source=&search=&is_active= */
async function listReels(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const filter = {};
    if (req.query.source) filter.source = req.query.source;
    if (req.query.is_active !== undefined) filter.is_active = req.query.is_active === 'true';
    if (req.query.search) filter.caption = { $regex: req.query.search, $options: 'i' };

    const [data, total] = await Promise.all([
      Reel.find(filter)
        .populate('product_tags', 'name')
        .sort({ created_at: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Reel.countDocuments(filter)
    ]);
    res.json({ data, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
}

/** POST /api/admin/reels */
async function createReel(req, res) {
  try {
    const { source, video_url } = req.body;
    if (!REEL_SOURCES.includes(source)) {
      return res.status(400).json({ message: 'Nguồn không hợp lệ', allowed: REEL_SOURCES });
    }
    if (!video_url || !video_url.trim()) {
      return res.status(400).json({ message: 'Thiếu link video' });
    }
    const reel = await Reel.create({
      source,
      source_url: req.body.source_url || '',
      video_url: video_url.trim(),
      thumbnail_url: req.body.thumbnail_url || '',
      caption: req.body.caption || '',
      hashtags: Array.isArray(req.body.hashtags) ? req.body.hashtags
        : (req.body.hashtags ? String(req.body.hashtags).split(',').map((s) => s.trim()).filter(Boolean) : []),
      author: {
        name: req.body.author_name || '',
        handle: req.body.author_handle || '',
        avatar_url: req.body.author_avatar || '',
        verified: !!req.body.author_verified
      },
      product_tags: Array.isArray(req.body.product_tags) ? req.body.product_tags : [],
      duration: req.body.duration || 0,
      is_active: req.body.is_active !== undefined ? req.body.is_active : true
    });
    res.status(201).json(reel);
  } catch (err) {
    res.status(400).json({ message: 'Không thể tạo reel', error: err.message });
  }
}

/** PUT /api/admin/reels/:id */
async function updateReel(req, res) {
  try {
    const patch = { ...req.body };
    // Gom các field author_* thành object author nếu có
    if (req.body.author_name !== undefined || req.body.author_handle !== undefined ||
        req.body.author_avatar !== undefined || req.body.author_verified !== undefined) {
      patch.author = {
        name: req.body.author_name || '',
        handle: req.body.author_handle || '',
        avatar_url: req.body.author_avatar || '',
        verified: !!req.body.author_verified
      };
    }
    if (typeof req.body.hashtags === 'string') {
      patch.hashtags = req.body.hashtags.split(',').map((s) => s.trim()).filter(Boolean);
    }
    const reel = await Reel.findByIdAndUpdate(req.params.id, patch, { new: true, runValidators: true });
    if (!reel) return res.status(404).json({ message: 'Không tìm thấy reel' });
    res.json(reel);
  } catch (err) {
    res.status(400).json({ message: 'Không thể cập nhật reel', error: err.message });
  }
}

/** DELETE /api/admin/reels/:id */
async function deleteReel(req, res) {
  try {
    const reel = await Reel.findByIdAndDelete(req.params.id);
    if (!reel) return res.status(404).json({ message: 'Không tìm thấy reel' });
    res.json({ message: 'Đã xoá reel' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
}

/* ========================= CONSULTATION REQUESTS ========================= */

/**
 * GET /api/admin/consultations?page=1&limit=20&status=&search=
 * Danh sách yêu cầu "Liên hệ tư vấn" người dùng gửi. Kèm số lượng theo trạng thái để hiện badge.
 */
async function listConsultations(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.search) {
      const regex = { $regex: req.query.search, $options: 'i' };
      filter.$or = [{ name: regex }, { phone: regex }, { email: regex }];
    }

    const [data, total, statusAgg] = await Promise.all([
      ConsultationRequest.find(filter)
        .populate('expert_id', 'name title')
        .populate('source_article_id', 'title')
        .populate('user_id', 'full_name email')
        .sort({ created_at: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      ConsultationRequest.countDocuments(filter),
      ConsultationRequest.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }])
    ]);

    const counts = { pending: 0, contacted: 0, done: 0, cancelled: 0 };
    statusAgg.forEach((s) => { if (s._id in counts) counts[s._id] = s.count; });

    res.json({ data, total, page, totalPages: Math.ceil(total / limit), counts });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
}

/** PUT /api/admin/consultations/:id  body: { status } — cập nhật tiến độ liên hệ */
async function updateConsultation(req, res) {
  try {
    const { status } = req.body;
    if (status && !CONSULT_STATUSES.includes(status)) {
      return res.status(400).json({ message: 'Trạng thái không hợp lệ', allowed: CONSULT_STATUSES });
    }
    const doc = await ConsultationRequest.findByIdAndUpdate(
      req.params.id, { status }, { new: true, runValidators: true }
    );
    if (!doc) return res.status(404).json({ message: 'Không tìm thấy yêu cầu' });
    res.json({ message: 'Đã cập nhật trạng thái', data: doc });
  } catch (err) {
    res.status(400).json({ message: 'Không thể cập nhật', error: err.message });
  }
}

/** DELETE /api/admin/consultations/:id */
async function deleteConsultation(req, res) {
  try {
    const doc = await ConsultationRequest.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Không tìm thấy yêu cầu' });
    res.json({ message: 'Đã xoá yêu cầu' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
}

module.exports = {
  listReels, createReel, updateReel, deleteReel,
  listConsultations, updateConsultation, deleteConsultation
};
