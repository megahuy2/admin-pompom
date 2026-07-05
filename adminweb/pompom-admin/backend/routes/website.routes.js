const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/website.controller');
const { verifyToken, requireAdmin } = require('../middleware/auth.middleware');

router.use(verifyToken, requireAdmin);

// Đăng ký CRUD cho một sub-resource
function mount(path, c) {
  router.get(`/${path}`, c.list);
  router.post(`/${path}`, c.create);
  router.put(`/${path}/:id`, c.update);
  router.delete(`/${path}/:id`, c.remove);
}

mount('collections', ctrl.collections);
mount('quick-links', ctrl.quickLinks);
mount('sections', ctrl.sections);

module.exports = router;
