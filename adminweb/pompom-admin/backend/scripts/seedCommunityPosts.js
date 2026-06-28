/**
 * Seed bài viết cộng đồng MẪU để test luồng duyệt nội dung (Phần 3).
 * Tạo vài bài CHỜ DUYỆT (is_hidden=true) + vài bài đã hiển thị, gán tác giả thật.
 *
 * An toàn & chạy lại được: xóa các bài seed cũ (đánh dấu qua nội dung chứa "[SEED]") rồi tạo lại.
 * Cách chạy:  node scripts/seedCommunityPosts.js
 */
require('dotenv').config();
const connectDB = require('../config/db');
const { CommunityPost, User, Product, ProductImage } = require('../models');

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const SAMPLE_POSTS = [
  { content: 'Mình mới thử son tint của PomPom, lên màu cực xinh và lâu trôi luôn! Review chi tiết cho các bạn nè.', post_type: 'review' },
  { content: 'Tips makeup nhẹ nhàng đi học: tone hồng nịnh da, ai da dầu thử ngay nhé.', post_type: 'makeup_tips' },
  { content: 'Look hôm nay với bảng phấn mắt Galaxy - tông tím khói sang chảnh.', post_type: 'looks' },
  { content: 'Cleansing balm này tẩy trang sạch mà không khô da, da nhạy cảm yên tâm dùng.', post_type: 'review' },
  { content: 'Cách order skincare buổi tối chuẩn nhất cho da mụn, mình đã giảm mụn rõ rệt.', post_type: 'makeup_tips' },
  { content: 'Mặt nạ môi mật ong dùng trước khi ngủ, sáng dậy môi mềm căng mọng.', post_type: 'review' }
];

async function run() {
  await connectDB();

  const users = await User.find({ role: 'user' }).select('_id');
  if (!users.length) {
    console.error('Cần có User (role=user) trước khi seed bài viết.');
    process.exit(1);
  }

  // Lấy vài ảnh sản phẩm thật làm ảnh bài viết (nếu có)
  const imgDocs = await ProductImage.find().select('image_url').limit(20);
  const imageUrls = imgDocs.map((i) => i.image_url);

  // Dọn bài seed cũ
  const del = await CommunityPost.deleteMany({ content: /\[SEED\]/ });
  if (del.deletedCount) console.log(`Đã xóa ${del.deletedCount} bài seed cũ.`);

  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  const docs = SAMPLE_POSTS.map((p, i) => ({
    user_id: pick(users)._id,
    content: `[SEED] ${p.content}`,
    // 4 bài đầu để CHỜ DUYỆT, 2 bài cuối đã hiển thị
    is_hidden: i < 4,
    post_type: p.post_type,
    images: imageUrls.length ? [pick(imageUrls), pick(imageUrls)] : [],
    like_count: Math.floor(Math.random() * 50),
    comment_count: Math.floor(Math.random() * 20),
    created_at: new Date(now - i * DAY)
  }));

  await CommunityPost.insertMany(docs);
  const pending = docs.filter((d) => d.is_hidden).length;
  console.log(`Đã tạo ${docs.length} bài viết (${pending} chờ duyệt, ${docs.length - pending} đã hiển thị).`);
  console.log('SEED HOÀN TẤT ✅');
  process.exit(0);
}

run().catch((err) => {
  console.error('Seed lỗi:', err);
  process.exit(1);
});
