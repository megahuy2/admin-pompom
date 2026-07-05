const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * 16. WISHLISTS
 * Quan hệ: USERS 1-N WISHLISTS, PRODUCTS 1-N WISHLISTS
 */
const wishlistSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  created_at: { type: Date, default: Date.now }
}, { timestamps: false });

/**
 * 17. PRODUCT_REVIEWS
 * Quan hệ: USERS 1-N PRODUCT_REVIEWS, PRODUCTS 1-N PRODUCT_REVIEWS, ORDERS 1-N PRODUCT_REVIEWS
 */
const productReviewSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  order_id: { type: Schema.Types.ObjectId, ref: 'Order', default: null },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, trim: true },
  images: [{ type: String, trim: true }],
  is_verified_purchase: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now }
}, { timestamps: false });

/**
 * 22. NOTIFICATIONS
 * Quan hệ: USERS 1-N NOTIFICATIONS
 */
const notificationSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, trim: true },
  title: { type: String, required: true, trim: true },
  message: { type: String, trim: true },
  image_url: { type: String, trim: true },
  action_url: { type: String, trim: true },
  is_read: { type: Boolean, default: false },
  reference_id: { type: String, trim: true },
  created_at: { type: Date, default: Date.now }
}, { timestamps: false });

/**
 * 23. BANNERS
 * Không nằm trong danh sách 48 quan hệ của Bảng 3.7 (bảng độc lập, do Admin quản lý nội dung trang chủ)
 */
const bannerSchema = new Schema({
  title: { type: String, required: true, trim: true },
  image_url: { type: String, required: true, trim: true },
  target_type: { type: String, trim: true }, // ví dụ: product, category, url
  target_id: { type: String, trim: true },
  target_url: { type: String, trim: true },
  sort_order: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true }
}, { timestamps: false });

/**
 * 24. SEARCH_HISTORY
 * Quan hệ: USERS 1-N SEARCH_HISTORY, GUEST_SESSIONS 1-N SEARCH_HISTORY
 */
const searchHistorySchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  session_id: { type: Schema.Types.ObjectId, ref: 'GuestSession', default: null },
  keyword: { type: String, required: true, trim: true },
  searched_at: { type: Date, default: Date.now }
}, { timestamps: false });

/**
 * 33. RECENTLY_VIEWED
 * Quan hệ: USERS 1-N RECENTLY_VIEWED, PRODUCTS 1-N RECENTLY_VIEWED
 */
const recentlyViewedSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  viewed_at: { type: Date, default: Date.now }
}, { timestamps: false });

// Index cho join review theo sản phẩm, wishlist/notification theo user
productReviewSchema.index({ product_id: 1 });
productReviewSchema.index({ user_id: 1 });
wishlistSchema.index({ user_id: 1 });
notificationSchema.index({ user_id: 1, is_read: 1 });
recentlyViewedSchema.index({ user_id: 1 });

module.exports = {
  Wishlist: mongoose.model('Wishlist', wishlistSchema),
  ProductReview: mongoose.model('ProductReview', productReviewSchema),
  Notification: mongoose.model('Notification', notificationSchema),
  Banner: mongoose.model('Banner', bannerSchema),
  SearchHistory: mongoose.model('SearchHistory', searchHistorySchema),
  RecentlyViewed: mongoose.model('RecentlyViewed', recentlyViewedSchema)
};
