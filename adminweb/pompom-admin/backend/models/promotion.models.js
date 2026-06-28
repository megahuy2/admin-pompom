const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * 7. VOUCHERS
 * Quan hệ: VOUCHERS 1-N USER_VOUCHERS
 */
const voucherSchema = new Schema({
  code: { type: String, required: true, unique: true, trim: true, uppercase: true },
  discount_type: { type: String, enum: ['percent', 'fixed'], required: true },
  discount_value: { type: Number, required: true, min: 0 },
  min_order_amount: { type: Number, default: 0 },
  max_discount: { type: Number, default: 0 },
  start_date: { type: Date, required: true },
  end_date: { type: Date, required: true },
  usage_limit: { type: Number, default: 0 },
  used_count: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true }
}, { timestamps: false });

/**
 * 8. USER_VOUCHERS
 * Quan hệ: USERS 1-N USER_VOUCHERS, VOUCHERS 1-N USER_VOUCHERS
 */
const userVoucherSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  voucher_id: { type: Schema.Types.ObjectId, ref: 'Voucher', required: true },
  used_at: { type: Date, default: null },
  assigned_at: { type: Date, default: Date.now }
}, { timestamps: false });

/**
 * 34. PROMOTIONS
 * Quan hệ: PROMOTIONS 1-N PROMOTION_DETAILS
 */
const promotionSchema = new Schema({
  name: { type: String, required: true, trim: true },
  type: { type: String, trim: true }, // ví dụ: flash_sale, bogo
  start_date: { type: Date, required: true },
  end_date: { type: Date, required: true },
  is_active: { type: Boolean, default: true }
}, { timestamps: false });

/**
 * 35. PROMOTION_DETAILS
 * Quan hệ: PROMOTIONS 1-N PROMOTION_DETAILS, PRODUCTS 1-N PROMOTION_DETAILS
 */
const promotionDetailSchema = new Schema({
  promotion_id: { type: Schema.Types.ObjectId, ref: 'Promotion', required: true },
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  buy_quantity: { type: Number, default: 1 },
  get_product_id: { type: Schema.Types.ObjectId, ref: 'Product', default: null },
  get_quantity: { type: Number, default: 0 },
  discount_percent: { type: Number, default: 0 },
  discount_amount: { type: Number, default: 0 }
}, { timestamps: false });

module.exports = {
  Voucher: mongoose.model('Voucher', voucherSchema),
  UserVoucher: mongoose.model('UserVoucher', userVoucherSchema),
  Promotion: mongoose.model('Promotion', promotionSchema),
  PromotionDetail: mongoose.model('PromotionDetail', promotionDetailSchema)
};
