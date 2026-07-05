const { Category, Product } = require('../models');

/**
 * GET /api/categories?withCount=true
 * Danh sách danh mục (kèm số sản phẩm mỗi danh mục nếu withCount=true).
 * Trả về mảng phẳng — danh mục thường ít, không phân trang.
 */
async function getCategories(req, res) {
  try {
    const categories = await Category.find()
      .populate('parent_id', 'category_name')
      .sort({ sort_order: 1, category_name: 1 })
      .lean();

    if (req.query.withCount === 'true') {
      const counts = await Product.aggregate([
        { $group: { _id: '$category_id', count: { $sum: 1 } } }
      ]);
      const countMap = {};
      counts.forEach((c) => { if (c._id) countMap[c._id.toString()] = c.count; });
      categories.forEach((c) => { c.product_count = countMap[c._id.toString()] || 0; });
    }

    res.json({ data: categories, total: categories.length });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
}

/** GET /api/categories/:id */
async function getCategoryById(req, res) {
  try {
    const category = await Category.findById(req.params.id).populate('parent_id', 'category_name');
    if (!category) return res.status(404).json({ message: 'Không tìm thấy danh mục' });
    res.json(category);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
}

/** POST /api/categories  body: { category_name, parent_id?, sort_order?, image_url? } */
async function createCategory(req, res) {
  try {
    const { category_name } = req.body;
    if (!category_name || !category_name.trim()) {
      return res.status(400).json({ message: 'Vui lòng nhập tên danh mục' });
    }
    const category = await Category.create({
      category_name: category_name.trim(),
      parent_id: req.body.parent_id || null,
      sort_order: req.body.sort_order || 0,
      image_url: req.body.image_url || ''
    });
    res.status(201).json(category);
  } catch (err) {
    res.status(400).json({ message: 'Không thể tạo danh mục', error: err.message });
  }
}

/** PUT /api/categories/:id */
async function updateCategory(req, res) {
  try {
    // Không cho đặt parent_id = chính nó (tránh vòng lặp)
    if (req.body.parent_id && String(req.body.parent_id) === String(req.params.id)) {
      return res.status(400).json({ message: 'Danh mục không thể là cha của chính nó' });
    }
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true
    });
    if (!category) return res.status(404).json({ message: 'Không tìm thấy danh mục' });
    res.json(category);
  } catch (err) {
    res.status(400).json({ message: 'Không thể cập nhật danh mục', error: err.message });
  }
}

/**
 * DELETE /api/categories/:id
 * Chặn xóa nếu còn sản phẩm thuộc danh mục hoặc còn danh mục con (bảo toàn dữ liệu liên kết).
 */
async function deleteCategory(req, res) {
  try {
    const [productCount, childCount] = await Promise.all([
      Product.countDocuments({ category_id: req.params.id }),
      Category.countDocuments({ parent_id: req.params.id })
    ]);
    if (productCount > 0) {
      return res.status(400).json({ message: `Không thể xóa: còn ${productCount} sản phẩm thuộc danh mục này` });
    }
    if (childCount > 0) {
      return res.status(400).json({ message: `Không thể xóa: còn ${childCount} danh mục con` });
    }
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ message: 'Không tìm thấy danh mục' });
    res.json({ message: 'Đã xóa danh mục' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
}

module.exports = { getCategories, getCategoryById, createCategory, updateCategory, deleteCategory };
