/**
 * Tạo (hoặc cập nhật) một tài khoản ADMIN để đăng nhập trang web admin.
 * Chạy lại được: nếu email đã tồn tại thì nâng role lên 'admin' + đặt lại mật khẩu.
 *
 * Cách chạy (mặc định):   node scripts/createAdmin.js
 * Tùy biến qua biến môi trường:
 *   ADMIN_EMAIL=... ADMIN_PASSWORD=... ADMIN_NAME=... node scripts/createAdmin.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const { User } = require('../models');

async function run() {
  const email = (process.env.ADMIN_EMAIL || 'admin@pompom.com').toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD || 'Admin@123';
  const fullName = process.env.ADMIN_NAME || 'Quản trị viên';

  await connectDB();

  const password_hash = await bcrypt.hash(password, 10);

  let user = await User.findOne({ email });
  if (user) {
    user.role = 'admin';
    user.status = 'active';
    user.password_hash = password_hash;
    if (!user.full_name) user.full_name = fullName;
    await user.save();
    console.log(`Đã cập nhật tài khoản hiện có thành ADMIN: ${email}`);
  } else {
    user = await User.create({
      full_name: fullName,
      email,
      password_hash,
      role: 'admin',
      status: 'active'
    });
    console.log(`Đã tạo tài khoản ADMIN mới: ${email}`);
  }

  console.log('------------------------------------');
  console.log(`  Email    : ${email}`);
  console.log(`  Mật khẩu : ${password}`);
  console.log(`  Role     : admin`);
  console.log('------------------------------------');
  console.log('HOÀN TẤT ✅');
  process.exit(0);
}

run().catch((err) => { console.error('Lỗi tạo admin:', err); process.exit(1); });
