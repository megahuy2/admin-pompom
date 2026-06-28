const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * 10. CARTS
 * Quan hệ: USERS 1-N CARTS, GUEST_SESSIONS 1-N CARTS, CARTS 1-N CART_ITEMS
 * Giữ cả user_id và session_id để hỗ trợ Guest Checkout (theo idea.md mục 6.2.2)
 */
const cartSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  session_id: { type: Schema.Types.ObjectId, ref: 'GuestSession', default: null }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

/**
 * 11. CART_ITEMS
 * Quan hệ: CARTS 1-N CART_ITEMS, PRODUCTS 1-N CART_ITEMS
 * Lưu ý: theo đúng Bảng 3.7 gốc, PRODUCT_VARIANTS-CART_ITEMS KHÔNG nằm trong 48 quan hệ
 * chính thức (đã được xác nhận loại bỏ ở vòng audit trước). Cột variant_id vẫn giữ lại
 * đúng theo data dictionary Excel nhưng không khai báo ref bắt buộc.
 */
const cartItemSchema = new Schema({
  cart_id: { type: Schema.Types.ObjectId, ref: 'Cart', required: true },
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  variant_id: { type: Schema.Types.ObjectId, ref: 'ProductVariant', default: null },
  quantity: { type: Number, required: true, min: 1 },
  unit_price: { type: Number, required: true, min: 0 }
}, { timestamps: false });

/**
 * 12. ORDERS
 * Quan hệ: USERS 1-N ORDERS, GUEST_SESSIONS 1-N ORDERS, ORDERS 1-N ORDER_ITEMS,
 * ORDERS 1-N ORDER_STATUS_HISTORY, ORDERS 1-1 PAYMENTS, ORDERS 1-N PRODUCT_REVIEWS
 * Lưu ý: USER_ADDRESSES-ORDERS KHÔNG nằm trong 48 quan hệ chính thức của Bảng 3.7
 * (đã loại bỏ ở vòng audit trước) — cột address_id vẫn giữ theo Excel nhưng không ref bắt buộc.
 */
const orderSchema = new Schema({
  order_number: { type: String, required: true, unique: true, trim: true },
  user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  session_id: { type: Schema.Types.ObjectId, ref: 'GuestSession', default: null },
  address_id: { type: Schema.Types.ObjectId, ref: 'UserAddress', default: null },
  total_amount: { type: Number, required: true, min: 0 },
  shipping_fee: { type: Number, default: 0 },
  discount_amount: { type: Number, default: 0 },
  final_amount: { type: Number, required: true, min: 0 },
  status: {
    type: String,
    enum: ['pending', 'paid', 'preparing', 'shipping', 'delivered', 'cancelled'],
    default: 'pending'
  },
  payment_method: { type: String, enum: ['COD', 'VNPay', 'MoMo', 'VISA'], required: true },
  payment_status: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
  shipping_carrier: { type: String, trim: true },
  tracking_number: { type: String, trim: true },
  note: { type: String, trim: true },
  created_at: { type: Date, default: Date.now }
}, { timestamps: false });

/**
 * 13. ORDER_ITEMS
 * Quan hệ: ORDERS 1-N ORDER_ITEMS, PRODUCTS 1-N ORDER_ITEMS
 * Lưu ý: PRODUCT_VARIANTS-ORDER_ITEMS KHÔNG nằm trong 48 quan hệ chính thức (đã loại bỏ).
 */
const orderItemSchema = new Schema({
  order_id: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  variant_id: { type: Schema.Types.ObjectId, ref: 'ProductVariant', default: null },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 0 }
}, { timestamps: false });

/**
 * 14. ORDER_STATUS_HISTORY
 * Quan hệ: ORDERS 1-N ORDER_STATUS_HISTORY
 */
const orderStatusHistorySchema = new Schema({
  order_id: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
  status: {
    type: String,
    enum: ['pending', 'paid', 'preparing', 'shipping', 'delivered', 'cancelled'],
    required: true
  },
  note: { type: String, trim: true },
  created_at: { type: Date, default: Date.now }
}, { timestamps: false });

/**
 * 15. PAYMENTS
 * Quan hệ: ORDERS 1-1 PAYMENTS
 */
const paymentSchema = new Schema({
  order_id: { type: Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
  transaction_id: { type: String, trim: true },
  amount: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['pending', 'success', 'failed', 'refunded'], default: 'pending' },
  payment_method: { type: String, enum: ['COD', 'VNPay', 'MoMo', 'VISA'], required: true },
  paid_at: { type: Date, default: null }
}, { timestamps: false });

module.exports = {
  Cart: mongoose.model('Cart', cartSchema),
  CartItem: mongoose.model('CartItem', cartItemSchema),
  Order: mongoose.model('Order', orderSchema),
  OrderItem: mongoose.model('OrderItem', orderItemSchema),
  OrderStatusHistory: mongoose.model('OrderStatusHistory', orderStatusHistorySchema),
  Payment: mongoose.model('Payment', paymentSchema)
};
