const { v2: cloudinary } = require('cloudinary');

/**
 * Cấu hình Cloudinary từ biến môi trường (.env).
 * Dùng để upload ảnh sản phẩm (và có thể mở rộng cho avatar, bài viết...).
 */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const isConfigured = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

/**
 * Upload 1 buffer ảnh lên Cloudinary, trả về { secure_url, public_id }.
 * Dùng upload_stream để đẩy thẳng buffer từ multer (memoryStorage), không cần lưu file tạm.
 */
function uploadBuffer(buffer, folder = 'pompom/products') {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
}

module.exports = { cloudinary, uploadBuffer, isConfigured };
