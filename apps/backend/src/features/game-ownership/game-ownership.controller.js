const GameOwnershipService = require('./game-ownership.service');

class GameOwnershipController {
    /**
     * GET /api/game-ownership/my-games
     * Get all games owned by the user
     */
    static async getMyGames(req, res) {
        try {
            const userId = req.user.id;
            const games = await GameOwnershipService.getUserGames(userId);
            res.json(games);
        } catch (error) {
            console.error('Error fetching user games:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * POST /api/game-ownership/redeem-key
     * Redeem a game key
     */
    static async redeemKey(req, res) {
        try {
            const userId = req.user.id;
            const { key, gameName } = req.body;

            if (!key) {
                return res.status(400).json({ error: 'Game key is required' });
            }

            const ownership = await GameOwnershipService.redeemKey(userId, key, gameName);
            res.status(201).json(ownership);
        } catch (error) {
            console.error('Error redeeming key:', error);
            res.status(400).json({ error: error.message });
        }
    }

    /**
     * POST /api/game-ownership/install
     * Mark a game as installed
     */
    static async installGame(req, res) {
        try {
            const userId = req.user.id;
            const { gameKey } = req.body;

            if (!gameKey) {
                return res.status(400).json({ error: 'gameKey is required' });
            }

            const ownership = await GameOwnershipService.installGame(userId, gameKey);
            res.json(ownership);
        } catch (error) {
            console.error('Error installing game:', error);
            res.status(404).json({ error: error.message });
        }
    }

    /**
     * GET /api/game-ownership/marketplace
     * Get marketplace listings
     */
    static async getMarketplace(req, res) {
        try {
            const userId = req.user.id;
            const { minPrice, maxPrice, genre, sort } = req.query;
            const filters = { minPrice, maxPrice, genre, sort };

            const listings = await GameOwnershipService.getMarketplace(filters, userId);
            res.json(listings);
        } catch (error) {
            console.error('Error fetching marketplace:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * GET /api/game-ownership/stats/:gameKey
     * Get market stats for a game
     */
    static async getGameStats(req, res) {
        try {
            const { gameKey } = req.params;
            const stats = await GameOwnershipService.getGameStats(gameKey);
            res.json(stats);
        } catch (error) {
            console.error('Error fetching game stats:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * POST /api/game-ownership/sell
     * List a game for sale
     */
    static async sellGame(req, res) {
        try {
            const userId = req.user.id;
            const { gameKey, askingPrice } = req.body;

            if (!gameKey || !askingPrice) {
                return res.status(400).json({ error: 'gameKey and askingPrice are required' });
            }

            const ownership = await GameOwnershipService.listForSale(userId, gameKey, askingPrice);
            res.json(ownership);
        } catch (error) {
            console.error('Error listing game:', error);
            res.status(400).json({ error: error.message });
        }
    }

    /**
     * POST /api/game-ownership/cancel-sale
     * Cancel a sale listing
     */
    static async cancelSale(req, res) {
        try {
            const userId = req.user.id;
            const { ownershipToken } = req.body;

            if (!ownershipToken) {
                return res.status(400).json({ error: 'ownershipToken is required' });
            }

            const ownership = await GameOwnershipService.cancelSale(userId, ownershipToken);
            res.json(ownership);
        } catch (error) {
            console.error('Error canceling sale:', error);
            res.status(404).json({ error: error.message });
        }
    }



    /**
     * GET /api/game-ownership/my-sales
     * Get user's active sales
     */
    static async getMySales(req, res) {
        try {
            const userId = req.user.id;
            const sales = await GameOwnershipService.getActiveSales(userId);
            res.json(sales);
        } catch (error) {
            console.error('Error fetching sales:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * GET /api/game-ownership/transactions
     * Get transaction history
     */
    static async getTransactions(req, res) {
        try {
            const userId = req.user.id;
            const transactions = await GameOwnershipService.getTransactions(userId);
            res.json(transactions);
        } catch (error) {
            console.error('Error fetching transactions:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * DELETE /api/game-ownership/marketplace/:id
     * Delete a marketplace listing (Admin or Owner)
     */
    static async deleteListing(req, res) {
        try {
            const userId = req.user.id;
            const { id } = req.params;

            const result = await GameOwnershipService.deleteListing(userId, id);
            res.json(result);
        } catch (error) {
            console.error('Error deleting listing:', error);
            res.status(403).json({ error: error.message });
        }
    }
}

module.exports = GameOwnershipController;
