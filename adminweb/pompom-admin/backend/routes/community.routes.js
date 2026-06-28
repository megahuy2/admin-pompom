const express = require('express');
const router = express.Router();
const {
  getPosts,
  getPendingPosts,
  getPostById,
  approvePost,
  rejectPost,
  hidePost
} = require('../controllers/community.controller');
const { verifyToken, requireAdmin } = require('../middleware/auth.middleware');

router.use(verifyToken, requireAdmin);

router.get('/posts', getPosts);
router.get('/posts/pending', getPendingPosts); // PHẢI đặt trước '/posts/:id'
router.get('/posts/:id', getPostById);
router.put('/posts/:id/approve', approvePost);
router.put('/posts/:id/reject', rejectPost);
router.put('/posts/:id/hide', hidePost);

module.exports = router;
