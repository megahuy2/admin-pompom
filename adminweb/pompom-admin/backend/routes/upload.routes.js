const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadProductImages, deleteProductImage } = require('../controllers/upload.controller');
const { verifyToken, requireAdmin } = require('../middleware/auth.middleware');

// Nhận file vào bộ nhớ (buffer) để đẩy thẳng lên Cloudinary, giới hạn 5MB/ảnh, tối đa 10 ảnh
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 10 },
  fileFilter: (req, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('Chỉ chấp nhận file ảnh'));
  }
});

router.use(verifyToken, requireAdmin);

// field 'images' khớp với FormData ở frontend (upload.service.ts)
router.post('/product/:productId', upload.array('images', 10), uploadProductImages);
router.delete('/product-image/:imageId', deleteProductImage);

module.exports = router;
