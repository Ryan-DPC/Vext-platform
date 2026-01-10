const express = require('express');
const router = express.Router();
const verifyToken = require('../../middleware/auth');
const GameCategoriesController = require('./game-categories.controller');

// All routes require authentication
router.use(verifyToken);

// GET /api/game-categories - List user's categories
router.get('/', GameCategoriesController.getAll);

// POST /api/game-categories - Create new category
router.post('/', GameCategoriesController.create);

// PUT /api/game-categories/:id - Update category
router.put('/:id', GameCategoriesController.update);

// DELETE /api/game-categories/:id - Delete category
router.delete('/:id', GameCategoriesController.delete);

// POST /api/game-categories/:id/assign - Assign game to category
router.post('/:id/assign', GameCategoriesController.assignGame);

module.exports = router;
