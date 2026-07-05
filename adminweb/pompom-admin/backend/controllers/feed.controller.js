/**
 * Controller cho màn hình CỘNG ĐỒNG (buyer app) - các endpoint công khai.
 * Phục vụ: reels, blogs, experts + bài tips, tin gần (24h + bán kính), liên hệ tư vấn.
 */
const {
  Reel, Blog, Expert, ExpertArticle, ConsultationRequest, NearbyPost
} = require('../models');

const EARTH_KM = 6378.1;

/** GET /api/feed/reels?page=1&limit=10 - feed reels dạng vuốt dọc */
async function getReels(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const filter = { is_active: true };
    if (req.query.source) filter.source = req.query.source;

    const [data, total] = await Promise.all([
      Reel.find(filter)
        .populate('product_tags', 'name slug price sale_price')
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

/** GET /api/feed/blogs?page=1&limit=10&category= */
async function getBlogs(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const filter = { is_published: true };
    if (req.query.category) filter.category = req.query.category;

    const [data, total] = await Promise.all([
      Blog.find(filter).sort({ published_at: -1 }).skip((page - 1) * limit).limit(limit),
      Blog.countDocuments(filter)
    ]);
    res.json({ data, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
}

/** GET /api/feed/blogs/:slug - chi tiết blog (tăng view) */
async function getBlogBySlug(req, res) {
  try {
    const blog = await Blog.findOneAndUpdate(
      { slug: req.params.slug, is_published: true },
      { $inc: { view_count: 1 } },
      { new: true }
    );
    if (!blog) return res.status(404).json({ message: 'Không tìm thấy blog' });
    res.json(blog);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
}

/** GET /api/feed/experts - danh sách bác sĩ tư vấn */
async function getExperts(req, res) {
  try {
    const data = await Expert.find({ is_available: true }).sort({ rating: -1 });
    res.json({ data });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
}

/** GET /api/feed/expert-articles?page=1&limit=10&category= - bài tips bác sĩ */
async function getExpertArticles(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const filter = { is_published: true };
    if (req.query.category) filter.category = req.query.category;

    const [data, total] = await Promise.all([
      ExpertArticle.find(filter)
        .populate('expert_id', 'name title specialty avatar_url rating contact')
        .populate('product_tags', 'name slug price sale_price')
        .sort({ published_at: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      ExpertArticle.countDocuments(filter)
    ]);
    res.json({ data, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
}

/**
 * POST /api/feed/consultation - gửi yêu cầu "Liên hệ tư vấn"
 * body: { name, phone, email?, expert_id?, source_article_id?, skin_type?, topic?, message?, preferred_channel? }
 */
async function createConsultation(req, res) {
  try {
    const { name, phone } = req.body;
    if (!name || !phone) return res.status(400).json({ message: 'Vui lòng nhập họ tên và số điện thoại' });
    const doc = await ConsultationRequest.create({
      user_id: req.body.user_id || null,
      expert_id: req.body.expert_id || null,
      source_article_id: req.body.source_article_id || null,
      name, phone,
      email: req.body.email || '',
      skin_type: req.body.skin_type || '',
      topic: req.body.topic || '',
      message: req.body.message || '',
      preferred_channel: req.body.preferred_channel || 'zalo'
    });
    res.status(201).json({ message: 'Đã gửi yêu cầu tư vấn, bác sĩ sẽ liên hệ bạn sớm nhất!', data: doc });
  } catch (err) {
    res.status(400).json({ message: 'Không gửi được yêu cầu', error: err.message });
  }
}

/**
 * GET /api/feed/nearby?lng=&lat=&radius=100 - tin gần (24h + bán kính km)
 * Chỉ trả tin CHƯA hết hạn (expires_at > now) và trong bán kính radius (mặc định 100km),
 * sắp xếp gần -> xa. Kèm khoảng cách (km) tới người xem.
 */
async function getNearbyPosts(req, res) {
  try {
    const lng = parseFloat(req.query.lng);
    const lat = parseFloat(req.query.lat);
    const radiusKm = parseFloat(req.query.radius) || 100;
    if (Number.isNaN(lng) || Number.isNaN(lat)) {
      return res.status(400).json({ message: 'Thiếu toạ độ người xem (lng, lat)' });
    }

    // $geoNear (aggregation) cho phép vừa lọc bán kính, vừa trả về khoảng cách
    const data = await NearbyPost.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [lng, lat] },
          distanceField: 'distance_m',
          maxDistance: radiusKm * 1000,
          spherical: true,
          query: { is_hidden: false, expires_at: { $gt: new Date() } }
        }
      },
      { $limit: 100 },
      {
        $lookup: {
          from: 'users', localField: 'user_id', foreignField: '_id', as: 'user'
        }
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          content: 1, media_type: 1, media_url: 1, thumbnail_url: 1,
          city: 1, district: 1, like_count: 1, view_count: 1,
          created_at: 1, expires_at: 1, product_tag: 1,
          distance_km: { $round: [{ $divide: ['$distance_m', 1000] }, 1] },
          'user.full_name': 1, 'user.avatar_url': 1
        }
      }
    ]);
    res.json({ data, center: { lng, lat }, radius_km: radiusKm, count: data.length });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
}

module.exports = {
  getReels, getBlogs, getBlogBySlug,
  getExperts, getExpertArticles, createConsultation,
  getNearbyPosts
};
