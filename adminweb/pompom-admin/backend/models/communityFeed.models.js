const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * ============================================================================
 *  COMMUNITY FEED - Các collection mở rộng cho màn hình Cộng đồng (buyer app)
 * ----------------------------------------------------------------------------
 *  Bổ sung cho community.models.js (posts/comments/likes/follows) để phục vụ:
 *   1) REELS        - thước phim ngắn crawl/nhúng từ Instagram, Facebook, TikTok
 *   2) BLOGS        - blog thương hiệu PomPom
 *   3) EXPERTS      - hồ sơ bác sĩ / chuyên gia tư vấn
 *   4) EXPERT_ARTICLES - bài viết tips từ bác sĩ tư vấn
 *   5) CONSULTATION_REQUESTS - yêu cầu "Liên hệ tư vấn"
 *   6) NEARBY_POSTS - tin ảnh/video kiểu Facebook, tự hết hạn sau 24h (TTL)
 *                     và hiển thị theo bán kính địa lý (2dsphere index)
 * ============================================================================
 */

/**
 * 1. REELS
 * Thước phim ngắn được đăng từ Instagram / Facebook / TikTok, hiển thị dạng
 * feed dọc (vuốt lên như Reels) để người mua lướt xem & quyết định mua hàng.
 * product_tags: gắn nhiều sản phẩm PomPom xuất hiện trong video.
 */
const reelSchema = new Schema({
  source: { type: String, enum: ['instagram', 'facebook', 'tiktok', 'youtube'], required: true },
  source_url: { type: String, trim: true },        // link bài gốc trên MXH
  video_url: { type: String, required: true, trim: true },  // link video (Cloudinary)
  thumbnail_url: { type: String, trim: true },
  caption: { type: String, trim: true },
  hashtags: [{ type: String, trim: true }],
  author: {
    name: { type: String, trim: true },
    handle: { type: String, trim: true },          // @username trên MXH
    avatar_url: { type: String, trim: true },
    verified: { type: Boolean, default: false }
  },
  product_tags: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
  duration: { type: Number, default: 0 },           // giây
  view_count: { type: Number, default: 0 },
  like_count: { type: Number, default: 0 },
  comment_count: { type: Number, default: 0 },
  share_count: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now }
}, { timestamps: false });
reelSchema.index({ is_active: 1, created_at: -1 });

/**
 * 2. BLOGS
 * Blog chính thức của thương hiệu (câu chuyện thương hiệu, bộ sưu tập, hướng dẫn).
 */
const blogSchema = new Schema({
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, trim: true },
  cover_image: { type: String, trim: true },
  excerpt: { type: String, trim: true },            // tóm tắt hiển thị ở card
  content: { type: String, trim: true },            // HTML/markdown nội dung đầy đủ
  author: {
    name: { type: String, trim: true, default: 'PomPom Team' },
    avatar_url: { type: String, trim: true },
    role: { type: String, trim: true, default: 'Thương hiệu' }
  },
  category: { type: String, trim: true },           // vd: 'Thương hiệu', 'Bí quyết', 'Sản phẩm mới'
  tags: [{ type: String, trim: true }],
  read_time: { type: Number, default: 3 },          // phút đọc
  view_count: { type: Number, default: 0 },
  like_count: { type: Number, default: 0 },
  is_published: { type: Boolean, default: true },
  published_at: { type: Date, default: Date.now }
}, { timestamps: false });
blogSchema.index({ is_published: 1, published_at: -1 });

/**
 * 3. EXPERTS
 * Hồ sơ bác sĩ / chuyên gia tư vấn. Là tác giả của EXPERT_ARTICLES và là
 * đối tượng nhận CONSULTATION_REQUESTS khi người dùng bấm "Liên hệ tư vấn".
 */
const expertSchema = new Schema({
  name: { type: String, required: true, trim: true },
  title: { type: String, trim: true },              // vd: 'Bác sĩ Da liễu'
  specialty: { type: String, trim: true },          // chuyên môn: 'Chăm sóc da mụn'
  avatar_url: { type: String, trim: true },
  credentials: { type: String, trim: true },        // học hàm/học vị, nơi công tác
  bio: { type: String, trim: true },
  years_experience: { type: Number, default: 0 },
  rating: { type: Number, default: 5, min: 0, max: 5 },
  consultation_count: { type: Number, default: 0 },
  contact: {
    phone: { type: String, trim: true },
    zalo: { type: String, trim: true },
    messenger: { type: String, trim: true },
    email: { type: String, trim: true }
  },
  is_available: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now }
}, { timestamps: false });

/**
 * 4. EXPERT_ARTICLES
 * Bài viết tips/kiến thức từ bác sĩ tư vấn. Kèm nút "Liên hệ tư vấn" trỏ về expert.
 */
const expertArticleSchema = new Schema({
  expert_id: { type: Schema.Types.ObjectId, ref: 'Expert', required: true },
  title: { type: String, required: true, trim: true },
  cover_image: { type: String, trim: true },
  excerpt: { type: String, trim: true },
  content: { type: String, trim: true },
  category: { type: String, trim: true },           // 'Chăm sóc da', 'Trang điểm', 'Thành phần'
  tags: [{ type: String, trim: true }],
  product_tags: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
  read_time: { type: Number, default: 4 },
  view_count: { type: Number, default: 0 },
  like_count: { type: Number, default: 0 },
  is_published: { type: Boolean, default: true },
  published_at: { type: Date, default: Date.now }
}, { timestamps: false });
expertArticleSchema.index({ is_published: 1, published_at: -1 });

/**
 * 5. CONSULTATION_REQUESTS
 * Yêu cầu tư vấn khi người dùng bấm "Liên hệ tư vấn". Hỗ trợ cả user đã đăng nhập
 * lẫn khách (điền tay). Admin/bác sĩ theo dõi qua status.
 */
const consultationRequestSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  expert_id: { type: Schema.Types.ObjectId, ref: 'Expert', default: null },
  source_article_id: { type: Schema.Types.ObjectId, ref: 'ExpertArticle', default: null },
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  email: { type: String, trim: true },
  skin_type: { type: String, enum: ['dry', 'oily', 'combination', 'normal', 'sensitive', ''], default: '' },
  topic: { type: String, trim: true },
  message: { type: String, trim: true },
  preferred_channel: { type: String, enum: ['phone', 'zalo', 'messenger', 'email'], default: 'zalo' },
  status: { type: String, enum: ['pending', 'contacted', 'done', 'cancelled'], default: 'pending' },
  created_at: { type: Date, default: Date.now }
}, { timestamps: false });
consultationRequestSchema.index({ status: 1, created_at: -1 });

/**
 * 6. NEARBY_POSTS
 * Tin nhanh dạng ảnh/video (kiểu Story Facebook) do người dùng đăng về hoạt động
 * sản phẩm (review, unbox...). Đặc thù:
 *   - Tự động biến mất sau 24h: TTL index trên expires_at (expireAfterSeconds: 0),
 *     MongoDB tự xoá document khi vượt mốc expires_at.
 *   - Hiển thị theo bán kính: location là GeoJSON Point + 2dsphere index,
 *     truy vấn $near / $geoNear để lấy tin trong bán kính 100km quanh người xem.
 */
const nearbyPostSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, trim: true },
  media_type: { type: String, enum: ['image', 'video'], required: true },
  media_url: { type: String, required: true, trim: true },
  thumbnail_url: { type: String, trim: true },
  product_tag: { type: Schema.Types.ObjectId, ref: 'Product', default: null },
  // GeoJSON Point: coordinates = [longitude, latitude]
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }  // [lng, lat]
  },
  city: { type: String, trim: true },
  district: { type: String, trim: true },
  like_count: { type: Number, default: 0 },
  view_count: { type: Number, default: 0 },
  is_hidden: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
  // Hết hạn sau 24h kể từ lúc đăng
  expires_at: { type: Date, required: true }
}, { timestamps: false });
// TTL: tự xoá khi qua thời điểm expires_at
nearbyPostSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });
// Geo: truy vấn theo bán kính
nearbyPostSchema.index({ location: '2dsphere' });

module.exports = {
  Reel: mongoose.model('Reel', reelSchema),
  Blog: mongoose.model('Blog', blogSchema),
  Expert: mongoose.model('Expert', expertSchema),
  ExpertArticle: mongoose.model('ExpertArticle', expertArticleSchema),
  ConsultationRequest: mongoose.model('ConsultationRequest', consultationRequestSchema),
  NearbyPost: mongoose.model('NearbyPost', nearbyPostSchema)
};
