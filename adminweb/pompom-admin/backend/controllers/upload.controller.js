const { Product, ProductImage } = require('../models');
const { cloudinary, uploadBuffer, isConfigured } = require('../config/cloudinary');

/**
 * POST /api/upload/product/:productId  (multipart, field 'images')
 * Upload nhiều ảnh cho 1 sản phẩm: đẩy lên Cloudinary rồi LƯU bản ghi ProductImage vào MongoDB.
 * Trả về danh sách ProductImage vừa tạo.
 */
async function uploadProductImages(req, res) {
  try {
    if (!isConfigured) {
      return res.status(500).json({ message: 'Chưa cấu hình Cloudinary (thiếu biến môi trường)' });
    }
    const product = await Product.findById(req.params.productId).select('_id');
    if (!product) return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });

    const files = req.files || [];
    if (files.length === 0) return res.status(400).json({ message: 'Chưa chọn ảnh nào' });

    // Thứ tự bắt đầu sau ảnh hiện có
    const existing = await ProductImage.countDocuments({ product_id: product._id });

    const created = [];
    for (let i = 0; i < files.length; i++) {
      const result = await uploadBuffer(files[i].buffer, 'pompom/products');
      const img = await ProductImage.create({
        product_id: product._id,
        image_url: result.secure_url,
        public_id: result.public_id,
        sort_order: existing + i
      });
      created.push(img);
    }

    res.status(201).json({ message: `Đã upload ${created.length} ảnh`, images: created });
  } catch (err) {
    res.status(400).json({ message: 'Upload ảnh thất bại', error: err.message });
  }
}

/**
 * DELETE /api/upload/product-image/:imageId
 * Xoá bản ghi ProductImage khỏi MongoDB.
 */
async function deleteProductImage(req, res) {
  try {
    const img = await ProductImage.findByIdAndDelete(req.params.imageId);
    if (!img) return res.status(404).json({ message: 'Không tìm thấy ảnh' });
    // Nếu là ảnh admin upload (có public_id) thì xoá luôn asset trên Cloudinary, tránh file mồ côi
    if (img.public_id && isConfigured) {
      try { await cloudinary.uploader.destroy(img.public_id); } catch (e) { /* bỏ qua lỗi Cloudinary */ }
    }
    res.json({ message: 'Đã xoá ảnh' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
}

module.exports = { uploadProductImages, deleteProductImage };
