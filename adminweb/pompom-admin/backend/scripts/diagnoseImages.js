/**
 * Chẩn đoán vì sao ảnh sản phẩm không load:
 * - Đếm products / product_images
 * - Kiểm tra khóa ngoại product_id trong product_images có trỏ tới product thật không (orphan?)
 * - Kiểm tra product nào KHÔNG có ảnh
 * - In mẫu image_url để xem đường dẫn có hợp lệ (http...) không
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { Product, ProductImage, ProductVariant, Category } = require('../models');

async function run() {
  await connectDB();

  const [countProducts, countImages, countVariants, countCategories] = await Promise.all([
    Product.countDocuments(),
    ProductImage.countDocuments(),
    ProductVariant.countDocuments(),
    Category.countDocuments()
  ]);

  console.log('\n===== TỔNG QUAN COLLECTION =====');
  console.log(`  products        : ${countProducts}`);
  console.log(`  product_images  : ${countImages}`);
  console.log(`  product_variants: ${countVariants}`);
  console.log(`  categories      : ${countCategories}`);

  // ---- 1. Mẫu product_images: kiểu dữ liệu product_id + image_url ----
  console.log('\n===== 5 PRODUCT_IMAGES ĐẦU TIÊN =====');
  const sampleImgs = await ProductImage.find().limit(5).lean();
  sampleImgs.forEach((img, i) => {
    console.log(`  [${i}] _id=${img._id}`);
    console.log(`       product_id = ${img.product_id}  (type: ${typeof img.product_id}, isObjectId: ${img.product_id instanceof mongoose.Types.ObjectId})`);
    console.log(`       image_url  = ${JSON.stringify(img.image_url)}`);
    console.log(`       sort_order = ${img.sort_order}`);
  });

  // ---- 2. Khóa ngoại: product_images trỏ tới product KHÔNG tồn tại (orphan) ----
  console.log('\n===== KIỂM TRA KHÓA NGOẠI (orphan images) =====');
  const allProductIds = new Set((await Product.find({}, '_id').lean()).map((p) => p._id.toString()));
  const allImages = await ProductImage.find({}, 'product_id image_url').lean();
  let orphan = 0;
  let nullFk = 0;
  const badUrl = [];
  allImages.forEach((img) => {
    if (img.product_id == null) { nullFk++; return; }
    if (!allProductIds.has(img.product_id.toString())) orphan++;
    const url = img.image_url || '';
    if (!/^https?:\/\//i.test(url)) badUrl.push(url);
  });
  console.log(`  Ảnh có product_id = null              : ${nullFk}`);
  console.log(`  Ảnh MỒ CÔI (product_id không có product): ${orphan}`);
  console.log(`  Ảnh có URL không phải http(s)         : ${badUrl.length}`);
  if (badUrl.length) {
    console.log('    -> mẫu URL "lạ":');
    badUrl.slice(0, 5).forEach((u) => console.log(`       ${JSON.stringify(u)}`));
  }

  // ---- 3. Chiều ngược lại: product nào không có ảnh ----
  const imgProductIds = new Set(allImages.filter((i) => i.product_id).map((i) => i.product_id.toString()));
  const productsNoImage = [...allProductIds].filter((pid) => !imgProductIds.has(pid));
  console.log('\n===== PRODUCT KHÔNG CÓ ẢNH =====');
  console.log(`  ${productsNoImage.length}/${countProducts} product không có bản ghi product_images nào`);

  // ---- 4. Thử đúng logic controller getProducts với 3 product đầu ----
  console.log('\n===== MÔ PHỎNG getProducts (3 product mới nhất) =====');
  const products = await Product.find().sort({ _id: -1 }).limit(3).lean();
  const pids = products.map((p) => p._id);
  const imgs = await ProductImage.find({ product_id: { $in: pids } }).sort({ sort_order: 1 }).lean();
  const firstBy = {};
  imgs.forEach((img) => {
    const k = img.product_id.toString();
    if (!firstBy[k]) firstBy[k] = img;
  });
  products.forEach((p) => {
    const first = firstBy[p._id.toString()];
    console.log(`  - ${p.name} (${p._id})`);
    console.log(`      images trả về: ${first ? JSON.stringify(first.image_url) : '[] (RỖNG!)'}`);
  });

  await mongoose.connection.close();
  process.exit(0);
}

run().catch((err) => { console.error('LỖI CHẨN ĐOÁN:', err); process.exit(1); });
