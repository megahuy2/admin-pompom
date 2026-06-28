const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUserById,
  updateUserStatus,
  sendNotification
} = require('../controllers/user.controller');
const { verifyToken, requireAdmin } = require('../middleware/auth.middleware');

router.use(verifyToken, requireAdmin);

router.get('/', getUsers);
router.get('/:id', getUserById);
router.put('/:id/status', updateUserStatus);
router.post('/:id/notifications', sendNotification);

module.exports = router;
