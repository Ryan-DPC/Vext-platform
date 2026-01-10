const GameCategoryService = require('./game-categories.service');

class GameCategoriesController {
    /**
     * GET /api/game-categories
     * Get all categories for the authenticated user
     */
    static async getAll(req, res) {
        try {
            const userId = req.user.id;
            const categories = await GameCategoryService.getUserCategories(userId);
            res.json(categories);
        } catch (error) {
            console.error('Error fetching categories:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * POST /api/game-categories
     * Create a new category
     */
    static async create(req, res) {
        try {
            const userId = req.user.id;
            const { name, icon } = req.body;

            if (!name) {
                return res.status(400).json({ error: 'Category name is required' });
            }

            const category = await GameCategoryService.createCategory(userId, name, icon);
            res.status(201).json(category);
        } catch (error) {
            console.error('Error creating category:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * DELETE /api/game-categories/:id
     * Delete a category
     */
    static async delete(req, res) {
        try {
            const userId = req.user.id;
            const { id } = req.params;

            const deleted = await GameCategoryService.deleteCategory(userId, id);

            if (!deleted) {
                return res.status(404).json({ error: 'Category not found' });
            }

            res.json({ success: true, message: 'Category deleted' });
        } catch (error) {
            console.error('Error deleting category:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * POST /api/game-categories/:id/assign
     * Assign a game to a category
     */
    static async assignGame(req, res) {
        try {
            const userId = req.user.id;
            const { id } = req.params;
            const { gameKey } = req.body;

            if (!gameKey) {
                return res.status(400).json({ error: 'gameKey is required' });
            }

            const category = await GameCategoryService.assignGame(userId, id, gameKey);
            res.json(category);
        } catch (error) {
            console.error('Error assigning game:', error);
            res.status(404).json({ error: error.message });
        }
    }

    /**
     * PUT /api/game-categories/:id
     * Update a category
     */
    static async update(req, res) {
        try {
            const userId = req.user.id;
            const { id } = req.params;
            const { name, icon } = req.body;

            const updates = {};
            if (name) updates.name = name;
            if (icon) updates.icon = icon;

            const category = await GameCategoryService.updateCategory(userId, id, updates);
            res.json(category);
        } catch (error) {
            console.error('Error updating category:', error);
            res.status(404).json({ error: error.message });
        }
    }
}

module.exports = GameCategoriesController;
