/**
 * Routes CÔNG KHAI cho màn hình Cộng đồng (buyer app) - không yêu cầu đăng nhập.
 * Mount tại /api/feed trong server.js
 */
const express = require('express');
const router = express.Router();
const {
  getReels, getBlogs, getBlogBySlug,
  getExperts, getExpertArticles, createConsultation,
  getNearbyPosts
} = require('../controllers/feed.controller');

router.get('/reels', getReels);
router.get('/blogs', getBlogs);
router.get('/blogs/:slug', getBlogBySlug);
router.get('/experts', getExperts);
router.get('/expert-articles', getExpertArticles);
router.post('/consultation', createConsultation);
router.get('/nearby', getNearbyPosts);

module.exports = router;
