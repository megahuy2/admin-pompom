const { Reel, ConsultationRequest, Blog, ExpertArticle, Expert } = require('../models');

const REEL_SOURCES = ['instagram', 'facebook', 'tiktok', 'youtube'];
const CONSULT_STATUSES = ['pending', 'contacted', 'done', 'cancelled'];

const slugify = (s) => String(s || '').toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const toTags = (v) => Array.isArray(v) ? v
  : (v ? String(v).split(',').map((s) => s.trim()).filter(Boolean) : []);

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

/* =============================== BLOGS =============================== */

/** GET /api/admin/blogs?page=1&limit=20&search=&category= */
async function listBlogs(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const filter = {};
    if (req.query.search) filter.title = { $regex: req.query.search, $options: 'i' };
    if (req.query.category) filter.category = req.query.category;
    const [data, total] = await Promise.all([
      Blog.find(filter).sort({ published_at: -1 }).skip((page - 1) * limit).limit(limit),
      Blog.countDocuments(filter)
    ]);
    res.json({ data, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) { res.status(500).json({ message: 'Lỗi server', error: err.message }); }
}

async function createBlog(req, res) {
  try {
    const { title } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ message: 'Thiếu tiêu đề' });
    const blog = await Blog.create({
      title: title.trim(),
      slug: (req.body.slug && req.body.slug.trim()) || (slugify(title) + '-' + Date.now().toString(36)),
      cover_image: req.body.cover_image || '',
      excerpt: req.body.excerpt || '',
      content: req.body.content || '',
      author: { name: req.body.author_name || 'PomPom Team', avatar_url: req.body.author_avatar || '', role: req.body.author_role || 'Thương hiệu' },
      category: req.body.category || '',
      tags: toTags(req.body.tags),
      read_time: req.body.read_time || 3,
      is_published: req.body.is_published !== undefined ? req.body.is_published : true
    });
    res.status(201).json(blog);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Slug đã tồn tại' });
    res.status(400).json({ message: 'Không thể tạo blog', error: err.message });
  }
}

async function updateBlog(req, res) {
  try {
    const patch = { ...req.body };
    if (req.body.author_name !== undefined || req.body.author_role !== undefined || req.body.author_avatar !== undefined) {
      patch.author = { name: req.body.author_name || 'PomPom Team', avatar_url: req.body.author_avatar || '', role: req.body.author_role || 'Thương hiệu' };
    }
    if (req.body.tags !== undefined) patch.tags = toTags(req.body.tags);
    const blog = await Blog.findByIdAndUpdate(req.params.id, patch, { new: true, runValidators: true });
    if (!blog) return res.status(404).json({ message: 'Không tìm thấy blog' });
    res.json(blog);
  } catch (err) { res.status(400).json({ message: 'Không thể cập nhật blog', error: err.message }); }
}

async function deleteBlog(req, res) {
  try {
    const blog = await Blog.findByIdAndDelete(req.params.id);
    if (!blog) return res.status(404).json({ message: 'Không tìm thấy blog' });
    res.json({ message: 'Đã xoá blog' });
  } catch (err) { res.status(500).json({ message: 'Lỗi server', error: err.message }); }
}

/* ========================= EXPERT ARTICLES (tips bác sĩ) ========================= */

async function listExpertArticles(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const filter = {};
    if (req.query.search) filter.title = { $regex: req.query.search, $options: 'i' };
    const [data, total] = await Promise.all([
      ExpertArticle.find(filter).populate('expert_id', 'name title avatar_url').sort({ published_at: -1 }).skip((page - 1) * limit).limit(limit),
      ExpertArticle.countDocuments(filter)
    ]);
    res.json({ data, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) { res.status(500).json({ message: 'Lỗi server', error: err.message }); }
}

async function createExpertArticle(req, res) {
  try {
    const { title, expert_id } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ message: 'Thiếu tiêu đề' });
    if (!expert_id) return res.status(400).json({ message: 'Vui lòng chọn bác sĩ/chuyên gia' });
    const art = await ExpertArticle.create({
      expert_id, title: title.trim(),
      cover_image: req.body.cover_image || '', excerpt: req.body.excerpt || '', content: req.body.content || '',
      category: req.body.category || '', tags: toTags(req.body.tags),
      read_time: req.body.read_time || 4,
      is_published: req.body.is_published !== undefined ? req.body.is_published : true
    });
    res.status(201).json(art);
  } catch (err) { res.status(400).json({ message: 'Không thể tạo bài viết', error: err.message }); }
}

async function updateExpertArticle(req, res) {
  try {
    const patch = { ...req.body };
    if (req.body.tags !== undefined) patch.tags = toTags(req.body.tags);
    const art = await ExpertArticle.findByIdAndUpdate(req.params.id, patch, { new: true, runValidators: true });
    if (!art) return res.status(404).json({ message: 'Không tìm thấy bài viết' });
    res.json(art);
  } catch (err) { res.status(400).json({ message: 'Không thể cập nhật', error: err.message }); }
}

async function deleteExpertArticle(req, res) {
  try {
    const art = await ExpertArticle.findByIdAndDelete(req.params.id);
    if (!art) return res.status(404).json({ message: 'Không tìm thấy bài viết' });
    res.json({ message: 'Đã xoá bài viết' });
  } catch (err) { res.status(500).json({ message: 'Lỗi server', error: err.message }); }
}

/* =============================== EXPERTS (bác sĩ) =============================== */

async function listExperts(req, res) {
  try {
    const data = await Expert.find().sort({ created_at: -1 });
    res.json({ data, total: data.length });
  } catch (err) { res.status(500).json({ message: 'Lỗi server', error: err.message }); }
}

async function createExpert(req, res) {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: 'Thiếu tên' });
    const expert = await Expert.create({
      name: name.trim(), title: req.body.title || '', specialty: req.body.specialty || '',
      avatar_url: req.body.avatar_url || '', credentials: req.body.credentials || '', bio: req.body.bio || '',
      years_experience: req.body.years_experience || 0,
      contact: { phone: req.body.phone || '', zalo: req.body.zalo || '', messenger: req.body.messenger || '', email: req.body.email || '' },
      is_available: req.body.is_available !== undefined ? req.body.is_available : true
    });
    res.status(201).json(expert);
  } catch (err) { res.status(400).json({ message: 'Không thể tạo chuyên gia', error: err.message }); }
}

async function updateExpert(req, res) {
  try {
    const patch = { ...req.body };
    if (req.body.phone !== undefined || req.body.zalo !== undefined || req.body.messenger !== undefined || req.body.email !== undefined) {
      patch.contact = { phone: req.body.phone || '', zalo: req.body.zalo || '', messenger: req.body.messenger || '', email: req.body.email || '' };
    }
    const expert = await Expert.findByIdAndUpdate(req.params.id, patch, { new: true, runValidators: true });
    if (!expert) return res.status(404).json({ message: 'Không tìm thấy chuyên gia' });
    res.json(expert);
  } catch (err) { res.status(400).json({ message: 'Không thể cập nhật', error: err.message }); }
}

async function deleteExpert(req, res) {
  try {
    const used = await ExpertArticle.countDocuments({ expert_id: req.params.id });
    if (used > 0) return res.status(400).json({ message: `Không thể xoá: còn ${used} bài viết gắn với chuyên gia này` });
    const expert = await Expert.findByIdAndDelete(req.params.id);
    if (!expert) return res.status(404).json({ message: 'Không tìm thấy chuyên gia' });
    res.json({ message: 'Đã xoá chuyên gia' });
  } catch (err) { res.status(500).json({ message: 'Lỗi server', error: err.message }); }
}

module.exports = {
  listReels, createReel, updateReel, deleteReel,
  listConsultations, updateConsultation, deleteConsultation,
  listBlogs, createBlog, updateBlog, deleteBlog,
  listExpertArticles, createExpertArticle, updateExpertArticle, deleteExpertArticle,
  listExperts, createExpert, updateExpert, deleteExpert
};
