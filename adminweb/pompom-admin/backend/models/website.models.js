const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * ============================================================================
 *  WEBSITE CONTENT — nội dung trang chủ do Admin quản lý (ngoài ERD 35 bảng).
 *  Trước đây là mock ở frontend, nay lưu thật vào MongoDB.
 *   - WEB_COLLECTIONS : bộ sưu tập sản phẩm hiển thị trang chủ
 *   - QUICK_LINKS     : liên kết nhanh (icon + đường dẫn)
 *   - HOME_SECTIONS   : cấu hình thứ tự các khối nội dung trang chủ
 * ============================================================================
 */

const webCollectionSchema = new Schema({
  name: { type: String, required: true, trim: true },
  image_url: { type: String, trim: true },
  product_ids: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
  sort_order: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const quickLinkSchema = new Schema({
  name: { type: String, required: true, trim: true },
  icon: { type: String, trim: true, default: 'link' },   // tên Material icon
  path: { type: String, trim: true },                    // đường dẫn / URL
  sort_order: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const homeSectionSchema = new Schema({
  name: { type: String, required: true, trim: true },
  content_type: { type: String, enum: ['banner', 'products', 'collections', 'community'], required: true },
  sort_order: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = {
  WebCollection: mongoose.model('WebCollection', webCollectionSchema),
  QuickLink: mongoose.model('QuickLink', quickLinkSchema),
  HomeSection: mongoose.model('HomeSection', homeSectionSchema)
};
