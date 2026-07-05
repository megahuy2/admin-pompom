const express = require('express');
const router = express.Router();
const {
  listReels, createReel, updateReel, deleteReel,
  listConsultations, updateConsultation, deleteConsultation
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

module.exports = router;
