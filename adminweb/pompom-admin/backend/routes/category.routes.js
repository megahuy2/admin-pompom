const express = require('express');
const router = express.Router();
const {
  getCategories, getCategoryById, createCategory, updateCategory, deleteCategory
} = require('../controllers/category.controller');
const { verifyToken, requireAdmin } = require('../middleware/auth.middleware');

router.use(verifyToken, requireAdmin);

router.get('/', getCategories);
router.get('/:id', getCategoryById);
router.post('/', createCategory);
router.put('/:id', updateCategory);
router.delete('/:id', deleteCategory);

module.exports = router;
