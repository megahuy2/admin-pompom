const { Banner } = require('../models');

/**
 * GET /api/banners?is_active=
 * Danh sách banner, sắp theo sort_order. Truyền ?is_active=true để lọc banner đang bật.
 */
async function getBanners(req, res) {
  try {
    const filter = {};
    if (req.query.is_active !== undefined) filter.is_active = req.query.is_active === 'true';
    const banners = await Banner.find(filter).sort({ sort_order: 1, _id: -1 });
    res.json({ data: banners, total: banners.length });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
}

/**
 * GET /api/banners/:id
 */
async function getBannerById(req, res) {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) return res.status(404).json({ message: 'Không tìm thấy banner' });
    res.json(banner);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
}

/**
 * POST /api/banners
 */
async function createBanner(req, res) {
  try {
    const banner = await Banner.create(req.body);
    res.status(201).json(banner);
  } catch (err) {
    res.status(400).json({ message: 'Không thể tạo banner', error: err.message });
  }
}

/**
 * PUT /api/banners/:id
 */
async function updateBanner(req, res) {
  try {
    const banner = await Banner.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!banner) return res.status(404).json({ message: 'Không tìm thấy banner' });
    res.json(banner);
  } catch (err) {
    res.status(400).json({ message: 'Không thể cập nhật banner', error: err.message });
  }
}

/**
 * DELETE /api/banners/:id
 * Soft delete: set is_active=false (giữ dữ liệu, an toàn).
 */
async function deleteBanner(req, res) {
  try {
    const banner = await Banner.findByIdAndUpdate(req.params.id, { is_active: false }, { new: true });
    if (!banner) return res.status(404).json({ message: 'Không tìm thấy banner' });
    res.json({ message: 'Đã ẩn banner (soft delete)', banner });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
}

module.exports = {
  getBanners,
  getBannerById,
  createBanner,
  updateBanner,
  deleteBanner
};
