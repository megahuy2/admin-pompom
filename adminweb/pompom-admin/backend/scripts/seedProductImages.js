/**
 * Nạp BÙ product_images + product_variants (đang bị rỗng trong DB) từ pompom_data.json.
 * Map product_id (số nguyên trong JSON) -> _id thật trong DB thông qua slug (unique).
 * KHÔNG đụng tới users / orders / product... nào khác. Chạy lại được (xóa 2 collection này trước).
 *
 *   node scripts/seedProductImages.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { Product, ProductImage, ProductVariant } = require('../models');

async function run() {
  await connectDB();
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'pompom_data.json'), 'utf-8'));

  // slug -> _id thật
  const dbProducts = await Product.find({}, 'slug').lean();
  const slugToId = new Map(dbProducts.map((p) => [p.slug, p._id]));
  // json product_id -> slug
  const jsonIdToSlug = new Map(data.products.map((p) => [p.product_id, p.slug]));
  // json product_id -> _id thật
  const idMap = (jsonProductId) => {
    const slug = jsonIdToSlug.get(jsonProductId);
    return slug ? slugToId.get(slug) : null;
  };

  console.log('\n--- Xóa product_images / product_variants cũ (nếu có) ---');
  await ProductImage.deleteMany({});
  await ProductVariant.deleteMany({});

  // ---- product_images ----
  let imgOk = 0, imgSkip = 0;
  for (const row of data.product_images) {
    const pid = idMap(row.product_id);
    if (!pid) { imgSkip++; continue; }
    await ProductImage.create({
      product_id: pid,
      image_url: row.image_url,
      sort_order: row.sort_order
    });
    imgOk++;
  }
  console.log(`  product_images: nạp ${imgOk}, bỏ qua ${imgSkip}`);

  // ---- product_variants ----
  let varOk = 0, varSkip = 0;
  for (const row of data.product_variants) {
    const pid = idMap(row.product_id);
    if (!pid) { varSkip++; continue; }
    await ProductVariant.create({
      product_id: pid,
      variant_name: row.variant_name,
      sku: row.sku,
      additional_price: row.additional_price,
      stock: row.stock,
      image_url: row.image_url
    });
    varOk++;
  }
  console.log(`  product_variants: nạp ${varOk}, bỏ qua ${varSkip}`);

  console.log('\n=== KIỂM TRA LẠI ===');
  console.log('  product_images  :', await ProductImage.countDocuments());
  console.log('  product_variants:', await ProductVariant.countDocuments());

  await mongoose.connection.close();
  process.exit(0);
}

run().catch((err) => { console.error('LỖI SEED:', err); process.exit(1); });
