const express = require('express');
const router = express.Router();
const {
  listReels, createReel, updateReel, deleteReel,
  listConsultations, updateConsultation, deleteConsultation,
  listBlogs, createBlog, updateBlog, deleteBlog,
  listExpertArticles, createExpertArticle, updateExpertArticle, deleteExpertArticle,
  listExperts, createExpert, updateExpert, deleteExpert
} = require('../controllers/adminFeed.controller');
const { verifyToken, requireAdmin } = require('../middleware/auth.middleware');

router.use(verifyToken, requireAdmin);

// Reels
router.get('/reels', listReels);
router.post('/reels', createReel);
router.put('/reels/:id', updateReel);
router.delete('/reels/:id', deleteReel);

// Liên hệ tư vấn
router.get('/consultations', listConsultations);
router.put('/consultations/:id', updateConsultation);
router.delete('/consultations/:id', deleteConsultation);

// Blog thương hiệu
router.get('/blogs', listBlogs);
router.post('/blogs', createBlog);
router.put('/blogs/:id', updateBlog);
router.delete('/blogs/:id', deleteBlog);

// Bài viết tips bác sĩ
router.get('/expert-articles', listExpertArticles);
router.post('/expert-articles', createExpertArticle);
router.put('/expert-articles/:id', updateExpertArticle);
router.delete('/expert-articles/:id', deleteExpertArticle);

// Bác sĩ / chuyên gia
router.get('/experts', listExperts);
router.post('/experts', createExpert);
router.put('/experts/:id', updateExpert);
router.delete('/experts/:id', deleteExpert);

module.exports = router;
