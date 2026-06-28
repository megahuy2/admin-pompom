const { Product, ProductImage, ProductVariant, Category } = require('../models');

/**
 * GET /api/products?page=1&limit=20&category_id=&search=
 */
async function getProducts(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const filter = {};

    if (req.query.category_id) filter.category_id = req.query.category_id;
    if (req.query.search) filter.name = { $regex: req.query.search, $options: 'i' };
    if (req.query.is_active !== undefined) filter.is_active = req.query.is_active === 'true';

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('category_id', 'category_name')
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ _id: -1 }),
      Product.countDocuments(filter)
    ]);

    // Kèm ảnh đầu tiên của mỗi sản phẩm để hiển thị thumbnail ở danh sách
    const productIds = products.map((p) => p._id);
    const images = await ProductImage.find({ product_id: { $in: productIds } }).sort({ sort_order: 1 });
    const firstImageByProduct = {};
    images.forEach((img) => {
      const key = img.product_id.toString();
      if (!firstImageByProduct[key]) firstImageByProduct[key] = img;
    });
    const data = products.map((p) => {
      const first = firstImageByProduct[p._id.toString()];
      return { ...p.toObject(), images: first ? [first] : [] };
    });

    res.json({ data, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
}

/**
 * GET /api/products/:id (gồm cả images + variants)
 */
async function getProductById(req, res) {
  try {
    const product = await Product.findById(req.params.id).populate('category_id', 'category_name');
    if (!product) return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });

    const [images, variants] = await Promise.all([
      ProductImage.find({ product_id: product._id }).sort({ sort_order: 1 }),
      ProductVariant.find({ product_id: product._id })
    ]);

    res.json({ ...product.toObject(), images, variants });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
}

/**
 * POST /api/products
 */
async function createProduct(req, res) {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ message: 'Không thể tạo sản phẩm', error: err.message });
  }
}

/**
 * PUT /api/products/:id
 */
async function updateProduct(req, res) {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!product) return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    res.json(product);
  } catch (err) {
    res.status(400).json({ message: 'Không thể cập nhật sản phẩm', error: err.message });
  }
}

/**
 * DELETE /api/products/:id
 * Soft delete: chuyển is_active = false thay vì xóa cứng, an toàn hơn cho dữ liệu liên kết
 */
async function deleteProduct(req, res) {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, { is_active: false }, { new: true });
    if (!product) return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    res.json({ message: 'Đã ẩn sản phẩm (soft delete)', product });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
}

/**
 * GET /api/categories — dùng cho dropdown khi tạo/sửa sản phẩm
 */
async function getCategories(req, res) {
  try {
    const categories = await Category.find().sort({ sort_order: 1 });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
}

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories
};
