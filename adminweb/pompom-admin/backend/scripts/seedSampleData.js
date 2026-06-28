/**
 * Seed dữ liệu MẪU cho demo dashboard & báo cáo.
 * - Tạo Orders + OrderItems + Payments + OrderStatusHistory trải đều 90 ngày qua
 * - Tạo RecentlyViewed + SearchHistory (phục vụ báo cáo hành vi người dùng - Phần 2)
 *
 * An toàn: chỉ tạo/đụng tới dữ liệu seed (order_number bắt đầu bằng "SEED-").
 * Chạy lại được nhiều lần: lần sau sẽ xóa data seed cũ rồi tạo lại.
 *
 * Cách chạy:  node scripts/seedSampleData.js
 */
require('dotenv').config();
const connectDB = require('../config/db');
const {
  Order, OrderItem, Payment, OrderStatusHistory,
  User, Product, RecentlyViewed, SearchHistory
} = require('../models');

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[rand(0, arr.length - 1)];
const pickMany = (arr, n) => {
  const copy = [...arr];
  const out = [];
  for (let i = 0; i < n && copy.length; i++) out.push(copy.splice(rand(0, copy.length - 1), 1)[0]);
  return out;
};

// Phân phối trạng thái: phần lớn đã giao để doanh thu có ý nghĩa
const STATUS_POOL = [
  'delivered', 'delivered', 'delivered', 'delivered', 'delivered', 'delivered',
  'shipping', 'preparing', 'paid', 'pending', 'cancelled'
];
const PAYMENT_METHODS = ['COD', 'VNPay', 'MoMo', 'VISA'];
const SEARCH_KEYWORDS = [
  'son môi', 'kem chống nắng', 'sữa rửa mặt', 'toner', 'serum vitamin c',
  'mặt nạ', 'kem dưỡng ẩm', 'tẩy trang', 'son môi', 'kem chống nắng',
  'serum vitamin c', 'phấn nước', 'son môi', 'sữa rửa mặt', 'kem chống nắng'
];

const ORDER_COUNT = 80;

async function run() {
  await connectDB();

  const [users, products] = await Promise.all([
    User.find({ role: 'user' }).select('_id'),
    // Loại sản phẩm test có giá ảo để doanh thu mẫu thực tế (mỹ phẩm: 100k–2tr)
    Product.find({ price: { $lte: 5000000 }, name: { $not: /^Testing/i } }).select('_id price')
  ]);

  if (!users.length || !products.length) {
    console.error('Cần có sẵn User (role=user) và Product trong DB trước khi seed.');
    process.exit(1);
  }

  // --- Dọn dữ liệu seed cũ -------------------------------------------------
  const oldOrders = await Order.find({ order_number: /^SEED-/ }).select('_id');
  const oldIds = oldOrders.map((o) => o._id);
  if (oldIds.length) {
    await Promise.all([
      OrderItem.deleteMany({ order_id: { $in: oldIds } }),
      Payment.deleteMany({ order_id: { $in: oldIds } }),
      OrderStatusHistory.deleteMany({ order_id: { $in: oldIds } }),
      Order.deleteMany({ _id: { $in: oldIds } })
    ]);
    console.log(`Đã xóa ${oldIds.length} đơn seed cũ.`);
  }

  // --- Tạo Orders ----------------------------------------------------------
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  let createdItems = 0;

  for (let i = 0; i < ORDER_COUNT; i++) {
    // Khoảng 1/10 đơn rơi vào "hôm nay", còn lại trải đều 90 ngày
    const daysAgo = i % 10 === 0 ? 0 : rand(0, 90);
    const created = new Date(now - daysAgo * DAY - rand(0, 23) * 60 * 60 * 1000);
    const status = pick(STATUS_POOL);
    const user = pick(users);

    const lineProducts = pickMany(products, rand(1, 4));
    const items = lineProducts.map((p) => ({
      product_id: p._id,
      quantity: rand(1, 3),
      price: p.price || rand(80000, 500000)
    }));
    const totalAmount = items.reduce((s, it) => s + it.price * it.quantity, 0);
    const shippingFee = pick([0, 15000, 25000, 30000]);
    const discount = pick([0, 0, 0, 20000, 50000]);
    const finalAmount = Math.max(0, totalAmount + shippingFee - discount);

    const order = await Order.create({
      order_number: `SEED-${now}-${i}`,
      user_id: user._id,
      total_amount: totalAmount,
      shipping_fee: shippingFee,
      discount_amount: discount,
      final_amount: finalAmount,
      status,
      payment_method: pick(PAYMENT_METHODS),
      payment_status: ['delivered', 'paid', 'shipping', 'preparing'].includes(status) ? 'paid' : 'pending',
      created_at: created
    });

    await OrderItem.insertMany(items.map((it) => ({ ...it, order_id: order._id })));
    createdItems += items.length;

    await OrderStatusHistory.create({ order_id: order._id, status, note: 'Seed mẫu', created_at: created });

    if (['delivered', 'paid', 'shipping', 'preparing'].includes(status)) {
      await Payment.create({
        order_id: order._id,
        amount: finalAmount,
        status: 'success',
        payment_method: order.payment_method,
        paid_at: created
      });
    }
  }
  console.log(`Đã tạo ${ORDER_COUNT} đơn hàng + ${createdItems} order items.`);

  // --- RecentlyViewed & SearchHistory -------------------------------------
  // Xóa toàn bộ rồi tạo lại đơn giản cho demo (2 bảng này không chứa data thật quan trọng)
  await Promise.all([RecentlyViewed.deleteMany({}), SearchHistory.deleteMany({})]);

  const rvDocs = [];
  const shDocs = [];
  for (const u of users) {
    for (const p of pickMany(products, rand(2, 6))) {
      rvDocs.push({ user_id: u._id, product_id: p._id, viewed_at: new Date(now - rand(0, 60) * DAY) });
    }
    for (let k = 0; k < rand(1, 4); k++) {
      shDocs.push({ user_id: u._id, keyword: pick(SEARCH_KEYWORDS), searched_at: new Date(now - rand(0, 60) * DAY) });
    }
  }
  await Promise.all([RecentlyViewed.insertMany(rvDocs), SearchHistory.insertMany(shDocs)]);
  console.log(`Đã tạo ${rvDocs.length} lượt xem + ${shDocs.length} lượt tìm kiếm.`);

  console.log('SEED HOÀN TẤT ✅');
  process.exit(0);
}

run().catch((err) => {
  console.error('Seed lỗi:', err);
  process.exit(1);
});
