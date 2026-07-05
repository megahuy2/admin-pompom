/**
 * MIGRATION: Vá lại các quan hệ (foreign key) bị lưu dạng ID SỐ LEGACY thay vì ObjectId.
 *
 * Bối cảnh: dữ liệu import ban đầu giữ khóa ngoại kiểu số (orders.user_id = 1..N trỏ tới
 * users.user_id legacy; order_items.order_id/product_id cũng là số). Ngoài ra model Mongoose
 * 'OrderItem' đọc collection mặc định 'orderitems' (rỗng) trong khi dữ liệu nằm ở 'order_items'.
 * => populate & aggregation (top-products, top-customers, tên khách ở đơn) đều fail.
 *
 * Việc migration này (an toàn, chạy lại được):
 *   1) Xây map legacy_number -> ObjectId cho users / products / orders.
 *   2) orders.user_id: số -> ObjectId (giữ null cho khách vãng lai).
 *   3) Nạp lại collection 'orderitems' (collection model đọc) từ 'order_items' với FK đã remap.
 *   4) Chuẩn hoá products.is_active về boolean.
 *
 * KHÔNG xoá dữ liệu gốc 'order_items' (giữ nguyên làm bản sao lịch sử).
 * Cách chạy: node scripts/migrateFixRelationships.js
 */
require('dotenv').config();
const connectDB = require('../config/db');
const mongoose = require('mongoose');

async function run() {
  await connectDB();
  const db = mongoose.connection.db;

  // ---------- 1. Build legacy -> ObjectId maps ----------
  const users = await db.collection('users').find({}, { projection: { _id: 1, user_id: 1 } }).toArray();
  const products = await db.collection('products').find({}, { projection: { _id: 1, product_id: 1 } }).toArray();
  const orders = await db.collection('orders').find({}, { projection: { _id: 1, order_id: 1, user_id: 1 } }).toArray();

  const userMap = new Map();      // legacy number -> ObjectId
  users.forEach(u => { if (u.user_id != null) userMap.set(Number(u.user_id), u._id); });
  const productMap = new Map();
  products.forEach(p => { if (p.product_id != null) productMap.set(Number(p.product_id), p._id); });
  const orderMap = new Map();
  let ordersHaveLegacy = 0;
  orders.forEach(o => { if (o.order_id != null) { orderMap.set(Number(o.order_id), o._id); ordersHaveLegacy++; } });

  console.log(`Maps: users=${userMap.size}, products=${productMap.size}, orders(legacy order_id)=${orderMap.size}/${orders.length}`);

  // ---------- 2. Fix orders.user_id (number -> ObjectId) ----------
  let fixedUserFk = 0, guestKept = 0, unmappedUser = 0;
  for (const o of orders) {
    if (typeof o.user_id === 'number') {
      const oid = userMap.get(o.user_id);
      if (oid) {
        await db.collection('orders').updateOne({ _id: o._id }, { $set: { user_id: oid } });
        fixedUserFk++;
      } else { unmappedUser++; }
    } else if (o.user_id == null) {
      guestKept++;
    }
  }
  console.log(`orders.user_id: fixed=${fixedUserFk}, guest(null)=${guestKept}, unmapped=${unmappedUser}`);

  // ---------- 3. Rebuild 'orderitems' from 'order_items' with remapped FKs ----------
  const rawItems = await db.collection('order_items').find({}).toArray();
  const remapped = [];
  let skipped = 0;
  for (const it of rawItems) {
    const orderOid = typeof it.order_id === 'number' ? orderMap.get(it.order_id) : it.order_id;
    const productOid = typeof it.product_id === 'number' ? productMap.get(it.product_id) : it.product_id;
    if (!orderOid || !productOid) { skipped++; continue; }
    remapped.push({
      order_id: orderOid,
      product_id: productOid,
      variant_id: it.variant_id && typeof it.variant_id !== 'number' ? it.variant_id : null,
      quantity: it.quantity != null ? it.quantity : 1,
      price: it.price != null ? it.price : 0
    });
  }
  await db.collection('orderitems').deleteMany({});
  if (remapped.length) await db.collection('orderitems').insertMany(remapped);
  console.log(`orderitems rebuilt: inserted=${remapped.length}, skipped(unmapped)=${skipped} (from order_items=${rawItems.length})`);

  // ---------- 4. Normalize products.is_active -> boolean ----------
  const toTrue = await db.collection('products').updateMany({ is_active: { $nin: [true, false] } }, [{ $set: { is_active: { $ne: ['$is_active', 0] } } }]);
  console.log(`products.is_active normalized: matched=${toTrue.matchedCount}, modified=${toTrue.modifiedCount}`);

  console.log('\n✅ MIGRATION HOÀN TẤT');
  process.exit(0);
}

run().catch((err) => { console.error('Migration lỗi:', err); process.exit(1); });
