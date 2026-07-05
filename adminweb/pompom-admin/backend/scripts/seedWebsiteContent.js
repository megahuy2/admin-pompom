/**
 * Seed nội dung Website (Collection / QuickLink / HomeSection) — thay dữ liệu mock cũ ở frontend.
 * An toàn: chỉ seed khi collection tương ứng đang TRỐNG (không ghi đè dữ liệu Admin đã tạo).
 * Cách chạy: node scripts/seedWebsiteContent.js
 */
require('dotenv').config();
const connectDB = require('../config/db');
const { WebCollection, QuickLink, HomeSection, Product } = require('../models');

async function run() {
  await connectDB();
  const products = await Product.find().select('_id image_url').limit(20).lean();
  const someIds = (n) => products.slice(0, n).map((p) => p._id);
  const IMG = 'https://res.cloudinary.com/dwu6e0ian/image/upload/v1781344406/PomPom_Velvet_Rose_Lipstick_vjgkow.webp';

  if (await WebCollection.countDocuments() === 0) {
    await WebCollection.insertMany([
      { name: 'Bộ sưu tập Mùa hè', image_url: IMG, product_ids: someIds(3), sort_order: 1 },
      { name: 'Son môi bán chạy', image_url: 'https://res.cloudinary.com/dwu6e0ian/image/upload/v1781344101/PomPom_Honey_Lip_Mask_knj4ek.webp', product_ids: someIds(2), sort_order: 2 },
      { name: 'Quà tặng đặc biệt', image_url: 'https://res.cloudinary.com/dwu6e0ian/image/upload/v1781344230/PomPom_Makeup_Sponge_Set_a0qzcx.webp', product_ids: someIds(1), sort_order: 3 }
    ]);
    console.log('✅ Seed WebCollection: 3');
  } else console.log('WebCollection đã có dữ liệu, bỏ qua.');

  if (await QuickLink.countDocuments() === 0) {
    await QuickLink.insertMany([
      { name: 'Khuyến mãi', icon: 'local_offer', path: '/sale', sort_order: 1 },
      { name: 'Sản phẩm mới', icon: 'fiber_new', path: '/new-arrivals', sort_order: 2 },
      { name: 'Bán chạy', icon: 'trending_up', path: '/best-sellers', sort_order: 3 },
      { name: 'Cộng đồng', icon: 'forum', path: '/community', sort_order: 4 }
    ]);
    console.log('✅ Seed QuickLink: 4');
  } else console.log('QuickLink đã có dữ liệu, bỏ qua.');

  if (await HomeSection.countDocuments() === 0) {
    await HomeSection.insertMany([
      { name: 'Banner đầu trang', content_type: 'banner', sort_order: 1 },
      { name: 'Sản phẩm nổi bật', content_type: 'products', sort_order: 2 },
      { name: 'Bộ sưu tập', content_type: 'collections', sort_order: 3 },
      { name: 'Bài viết cộng đồng', content_type: 'community', sort_order: 4 }
    ]);
    console.log('✅ Seed HomeSection: 4');
  } else console.log('HomeSection đã có dữ liệu, bỏ qua.');

  console.log('Hoàn tất.');
  process.exit(0);
}
run().catch((e) => { console.error(e); process.exit(1); });
