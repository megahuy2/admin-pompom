const express = require('express');
const router = express.Router();
const {
  getBanners,
  getBannerById,
  createBanner,
  updateBanner,
  deleteBanner
} = require('../controllers/banner.controller');
const { verifyToken, requireAdmin } = require('../middleware/auth.middleware');

router.use(verifyToken, requireAdmin);

router.get('/', getBanners);
router.get('/:id', getBannerById);
router.post('/', createBanner);
router.put('/:id', updateBanner);
router.delete('/:id', deleteBanner);

module.exports = router;
