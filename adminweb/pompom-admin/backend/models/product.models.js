const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * 3. CATEGORIES
 * Quan hệ: CATEGORIES 1-N CATEGORIES (parent - tự tham chiếu), CATEGORIES 1-N PRODUCTS
 */
const categorySchema = new Schema({
  category_name: { type: String, required: true, trim: true },
  parent_id: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
  sort_order: { type: Number, default: 0 },
  image_url: { type: String, trim: true }
}, { timestamps: false });

/**
 * 4. PRODUCTS
 * Quan hệ: PRODUCTS 1-N với PRODUCT_IMAGES, PRODUCT_VARIANTS, CART_ITEMS, ORDER_ITEMS,
 * WISHLISTS, PRODUCT_REVIEWS, COMMUNITY_POSTS(product_tag), RECENTLY_VIEWED, PROMOTION_DETAILS
 */
const productSchema = new Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, trim: true },
  description: { type: String, trim: true },
  price: { type: Number, required: true, min: 0 },
  sale_price: { type: Number, min: 0 },
  stock: { type: Number, default: 0, min: 0 },
  sku: { type: String, required: true, unique: true, trim: true },
  category_id: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
  brand: { type: String, trim: true, default: 'PomPom' },
  is_active: { type: Boolean, default: true }
}, { timestamps: false });

/**
 * 5. PRODUCT_IMAGES
 * Quan hệ: PRODUCTS 1-N PRODUCT_IMAGES
 */
const productImageSchema = new Schema({
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  image_url: { type: String, required: true, trim: true },
  sort_order: { type: Number, default: 0 }
}, { timestamps: false });

/**
 * 6. PRODUCT_VARIANTS
 * Quan hệ: PRODUCTS 1-N PRODUCT_VARIANTS
 */
const productVariantSchema = new Schema({
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  variant_name: { type: String, required: true, trim: true },
  sku: { type: String, required: true, unique: true, trim: true },
  additional_price: { type: Number, default: 0 },
  stock: { type: Number, default: 0, min: 0 },
  image_url: { type: String, trim: true }
}, { timestamps: false });

module.exports = {
  Category: mongoose.model('Category', categorySchema),
  Product: mongoose.model('Product', productSchema),
  ProductImage: mongoose.model('ProductImage', productImageSchema),
  ProductVariant: mongoose.model('ProductVariant', productVariantSchema)
};
