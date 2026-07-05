/**
 * Xoá các collection VẬT LÝ không gắn với model Mongoose nào (mồ côi) — chính là các
 * bản snake_case trùng lặp còn sót sau khi chuẩn hoá dữ liệu về collection mặc định
 * (pluralized) qua importExcelData. Dữ liệu đã có bản đúng (FK ObjectId) ở collection model đọc.
 *
 * An toàn: chỉ xoá collection KHÔNG được bất kỳ model nào đọc.
 * Cách chạy: node scripts/dropOrphanCollections.js
 */
require('dotenv').config();
const connectDB = require('../config/db');
const mongoose = require('mongoose');
const models = require('../models');

async function run() {
  await connectDB();
  const db = mongoose.connection.db;
  const readColls = new Set(Object.values(models).map(m => m.collection.collectionName));
  const physical = (await db.listCollections().toArray()).map(c => c.name);

  const orphans = physical.filter(n => !readColls.has(n));
  console.log(`Collection model đang đọc: ${readColls.size}. Mồ côi: ${orphans.length}`);
  for (const name of orphans) {
    const cnt = await db.collection(name).countDocuments();
    await db.collection(name).drop();
    console.log(`  ✔ đã xoá orphan: ${name} (${cnt} doc)`);
  }
  console.log('Hoàn tất.');
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
