const mongoose = require('mongoose');

async function connectDB() {
  try {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/pompom';
    await mongoose.connect(uri);
    console.log(`[MongoDB] Đã kết nối: ${uri}`);
  } catch (err) {
    console.error('[MongoDB] Lỗi kết nối:', err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
