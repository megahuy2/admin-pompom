const { WebCollection, QuickLink, HomeSection } = require('../models');

/**
 * CRUD chung cho nội dung Website (Collection / QuickLink / HomeSection).
 * Tạo factory để tránh lặp code, sắp xếp theo sort_order.
 */
function crud(Model, label) {
  return {
    list: async (req, res) => {
      try {
        const data = await Model.find().sort({ sort_order: 1, created_at: 1 });
        res.json({ data });
      } catch (err) { res.status(500).json({ message: 'Lỗi server', error: err.message }); }
    },
    create: async (req, res) => {
      try {
        const doc = await Model.create(req.body);
        res.status(201).json(doc);
      } catch (err) { res.status(400).json({ message: `Không thể tạo ${label}`, error: err.message }); }
    },
    update: async (req, res) => {
      try {
        const doc = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!doc) return res.status(404).json({ message: `Không tìm thấy ${label}` });
        res.json(doc);
      } catch (err) { res.status(400).json({ message: `Không thể cập nhật ${label}`, error: err.message }); }
    },
    remove: async (req, res) => {
      try {
        const doc = await Model.findByIdAndDelete(req.params.id);
        if (!doc) return res.status(404).json({ message: `Không tìm thấy ${label}` });
        res.json({ message: `Đã xóa ${label}` });
      } catch (err) { res.status(500).json({ message: 'Lỗi server', error: err.message }); }
    }
  };
}

module.exports = {
  collections: crud(WebCollection, 'collection'),
  quickLinks: crud(QuickLink, 'quick link'),
  sections: crud(HomeSection, 'section')
};
