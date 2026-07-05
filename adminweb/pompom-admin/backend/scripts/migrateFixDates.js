/**
 * MIGRATION: Chuẩn hoá các trường ngày bị lưu dạng CHUỖI/độ khác về kiểu Date thật.
 * Dữ liệu import ban đầu lưu orders.created_at (và vài trường ngày khác) dạng string,
 * khiến $dateToString trong báo cáo doanh thu lỗi ("must be coercible to date").
 *
 * An toàn & chạy lại được: chỉ đụng document có trường ngày KHÔNG phải kiểu Date.
 * Cách chạy: node scripts/migrateFixDates.js
 */
require('dotenv').config();
const connectDB = require('../config/db');
const mongoose = require('mongoose');

// collection -> danh sách field ngày cần chuẩn hoá
const TARGETS = {
  orders: ['created_at'],
  order_status_history: ['created_at'],
  orderitems: [],
  payments: ['paid_at'],
  users: ['created_at', 'updated_at', 'join_date', 'last_login', 'birth_date'],
  products: [],
  community_posts: ['created_at'],
  reels: ['created_at'],
  blogs: ['published_at'],
  nearbyposts: ['created_at', 'expires_at']
};

async function run() {
  await connectDB();
  const db = mongoose.connection.db;

  for (const [coll, fields] of Object.entries(TARGETS)) {
    if (!fields.length) continue;
    const exists = await db.listCollections({ name: coll }).hasNext();
    if (!exists) { console.log(`(bỏ qua ${coll}: không tồn tại)`); continue; }

    for (const field of fields) {
      // Chỉ lấy doc có field là string (cần convert). $type 'string' = 2
      const cursor = db.collection(coll).find({ [field]: { $type: 'string' } }, { projection: { [field]: 1 } });
      let fixed = 0, bad = 0;
      for await (const doc of cursor) {
        const d = new Date(doc[field]);
        if (isNaN(d.getTime())) { bad++; continue; }
        await db.collection(coll).updateOne({ _id: doc._id }, { $set: { [field]: d } });
        fixed++;
      }
      if (fixed || bad) console.log(`${coll}.${field}: converted=${fixed}${bad ? `, invalid(skip)=${bad}` : ''}`);
    }
  }

  console.log('\n✅ FIX DATES HOÀN TẤT');
  process.exit(0);
}

run().catch((err) => { console.error('Migration lỗi:', err); process.exit(1); });
