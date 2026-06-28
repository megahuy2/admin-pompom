const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * 1. USERS
 * Quan hệ (Bảng 3.7): USERS 1-N với GUEST_SESSIONS, USER_VOUCHERS, USER_ADDRESSES,
 * CARTS, ORDERS, WISHLISTS, PRODUCT_REVIEWS, COMMUNITY_POSTS, COMMENTS, LIKES,
 * FOLLOWS(follower), FOLLOWS(following), NOTIFICATIONS, SEARCH_HISTORY,
 * AI_SESSIONS, MEMBERSHIP_HISTORY, POINTS_TRANSACTIONS, RECENTLY_VIEWED,
 * CHATBOT_CONVERSATIONS
 */
const userSchema = new Schema({
  full_name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password_hash: { type: String, required: true },
  phone_number: { type: String, trim: true },
  avatar_url: { type: String, trim: true },
  bio: { type: String, trim: true },
  join_date: { type: Date, default: Date.now },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  status: { type: String, enum: ['active', 'locked'], default: 'active' },
  last_login: { type: Date },
  birth_date: { type: Date },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  skin_type: { type: String, enum: ['dry', 'oily', 'combination', 'normal', 'sensitive'] }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

/**
 * 2. GUEST_SESSIONS
 * Quan hệ: GUEST_SESSIONS 1-N với CARTS, ORDERS, SEARCH_HISTORY, AI_SESSIONS, CHATBOT_CONVERSATIONS
 * Lưu ý: USERS-GUEST_SESSIONS là quan hệ trong Bảng 3.7 nguồn (không có FK user_id trực tiếp
 * trong data dictionary gốc của sheet này — giữ nguyên đúng cấu trúc cột đã có trong Excel).
 */
const guestSessionSchema = new Schema({
  session_id: { type: String, required: true, unique: true, trim: true },
  created_at: { type: Date, default: Date.now },
  last_activity: { type: Date, default: Date.now }
}, { timestamps: false });

/**
 * 9. USER_ADDRESSES
 * Quan hệ: USERS 1-N USER_ADDRESSES
 */
const userAddressSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  label: { type: String, trim: true },
  recipient_name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  address_line: { type: String, required: true, trim: true },
  city: { type: String, trim: true },
  district: { type: String, trim: true },
  ward: { type: String, trim: true },
  is_default: { type: Boolean, default: false }
}, { timestamps: false });

module.exports = {
  User: mongoose.model('User', userSchema),
  GuestSession: mongoose.model('GuestSession', guestSessionSchema),
  UserAddress: mongoose.model('UserAddress', userAddressSchema)
};
