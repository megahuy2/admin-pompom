/**
 * Migration/seed nhẹ: chuyển một số đơn 'delivered' sang trạng thái 'returned' (Hoàn hàng)
 * để Dashboard Row 2 có dữ liệu thật cho card "Hoàn hàng".
 *
 * An toàn & chạy lại được: chỉ tác động khi số đơn 'returned' hiện tại < mục tiêu.
 * Cách chạy: node scripts/seedReturnedOrders.js
 */
require('dotenv').config();
const connectDB = require('../config/db');
const { Order, OrderStatusHistory } = require('../models');

const TARGET = 6; // số đơn hoàn hàng mong muốn

async function run() {
  await connectDB();

  const current = await Order.countDocuments({ status: 'returned' });
  if (current >= TARGET) {
    console.log(`Đã có ${current} đơn 'returned' (>= ${TARGET}). Bỏ qua.`);
    process.exit(0);
  }

  const need = TARGET - current;
  // Lấy các đơn đã giao gần nhất để chuyển sang hoàn hàng
  const candidates = await Order.find({ status: 'delivered' })
    .sort({ created_at: -1 })
    .limit(need)
    .select('_id order_number');

  if (!candidates.length) {
    console.log('Không có đơn delivered để chuyển. Bỏ qua.');
    process.exit(0);
  }

  for (const o of candidates) {
    o.status = 'returned';
    await o.save();
    await OrderStatusHistory.create({
      order_id: o._id,
      status: 'returned',
      note: 'Khách yêu cầu hoàn hàng (seed demo)'
    });
    console.log(`  ✔ ${o.order_number} -> returned`);
  }

  const total = await Order.countDocuments({ status: 'returned' });
  console.log(`Hoàn tất. Tổng đơn 'returned' hiện tại: ${total}`);
  process.exit(0);
}

run().catch((err) => { console.error('Seed lỗi:', err); process.exit(1); });
