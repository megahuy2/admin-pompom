const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * 18. COMMUNITY_POSTS
 * Quan hệ: USERS 1-N COMMUNITY_POSTS, PRODUCTS 1-N COMMUNITY_POSTS (product_tag),
 * COMMUNITY_POSTS 1-N COMMENTS, COMMUNITY_POSTS 1-N LIKES
 */
const communityPostSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true, trim: true },
  images: [{ type: String, trim: true }], // tối đa 5 ảnh (theo idea.md mục 6.4.2)
  product_tag: { type: Schema.Types.ObjectId, ref: 'Product', default: null },
  post_type: { type: String, enum: ['review', 'makeup_tips', 'looks'] },
  like_count: { type: Number, default: 0 },
  comment_count: { type: Number, default: 0 },
  is_hidden: { type: Boolean, default: false }, // chờ Admin duyệt
  created_at: { type: Date, default: Date.now }
}, { timestamps: false });

/**
 * 19. COMMENTS
 * Quan hệ: COMMUNITY_POSTS 1-N COMMENTS, USERS 1-N COMMENTS, COMMENTS 1-N COMMENTS (parent - reply)
 */
const commentSchema = new Schema({
  post_id: { type: Schema.Types.ObjectId, ref: 'CommunityPost', required: true },
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  parent_id: { type: Schema.Types.ObjectId, ref: 'Comment', default: null },
  content: { type: String, required: true, trim: true },
  created_at: { type: Date, default: Date.now }
}, { timestamps: false });

/**
 * 20. LIKES
 * Quan hệ: USERS 1-N LIKES, COMMUNITY_POSTS 1-N LIKES
 * target_type/target_id dùng polymorphic reference (vd: post) theo đúng cấu trúc Excel gốc
 */
const likeSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  target_type: { type: String, required: true, trim: true }, // ví dụ: 'post'
  target_id: { type: Schema.Types.ObjectId, required: true },
  created_at: { type: Date, default: Date.now }
}, { timestamps: false });

/**
 * 21. FOLLOWS
 * Quan hệ: USERS 1-N FOLLOWS (follower), USERS 1-N FOLLOWS (following)
 */
const followSchema = new Schema({
  follower_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  followed_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  created_at: { type: Date, default: Date.now }
}, { timestamps: false });

// Index cho feed cộng đồng, duyệt nội dung, đếm like/comment
communityPostSchema.index({ user_id: 1 });
communityPostSchema.index({ is_hidden: 1, created_at: -1 });
commentSchema.index({ post_id: 1 });
likeSchema.index({ target_type: 1, target_id: 1 });
followSchema.index({ follower_id: 1 });
followSchema.index({ followed_id: 1 });

module.exports = {
  CommunityPost: mongoose.model('CommunityPost', communityPostSchema),
  Comment: mongoose.model('Comment', commentSchema),
  Like: mongoose.model('Like', likeSchema),
  Follow: mongoose.model('Follow', followSchema)
};
