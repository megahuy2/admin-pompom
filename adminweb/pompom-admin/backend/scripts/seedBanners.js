/**
 * Seed banner MẪU (dữ liệu THẬT trong collection banners) để test trang Quản lý Banner.
 * Chạy lại được: xóa banner seed cũ (title chứa "[SEED]") rồi tạo lại.
 * Cách chạy:  node scripts/seedBanners.js
 */
require('dotenv').config();
const connectDB = require('../config/db');
const { Banner, ProductImage } = require('../models');

async function run() {
  await connectDB();

  // Mượn vài ảnh sản phẩm thật làm ảnh banner demo
  const imgs = await ProductImage.find().select('image_url').limit(5);
  const urls = imgs.map((i) => i.image_url);
  const fallback = 'https://res.cloudinary.com/dwu6e0ian/image/upload/v1781344406/PomPom_Velvet_Rose_Lipstick_vjgkow.webp';
  const img = (i) => urls[i] || fallback;

  const del = await Banner.deleteMany({ title: /\[SEED\]/ });
  if (del.deletedCount) console.log(`Đã xóa ${del.deletedCount} banner seed cũ.`);

  const docs = [
    { title: '[SEED] Khuyến mãi mùa hè', image_url: img(0), target_type: 'url', target_url: '/sale', sort_order: 1, is_active: true },
    { title: '[SEED] Bộ sưu tập son mới', image_url: img(1), target_type: 'category', target_id: 'son-moi', sort_order: 2, is_active: true },
    { title: '[SEED] Flash Sale cuối tuần', image_url: img(2), target_type: 'url', target_url: '/flash-sale', sort_order: 3, is_active: true }
  ];
  await Banner.insertMany(docs);
  console.log(`Đã tạo ${docs.length} banner.`);
  console.log('SEED HOÀN TẤT ✅');
  process.exit(0);
}

run().catch((err) => { console.error('Seed lỗi:', err); process.exit(1); });
