const express = require('express');
const router = express.Router();
const gameSyncService = require('../../services/gameSyncService');
const verifyToken = require('../../middleware/auth');

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

/**
 * @route POST /api/admin/sync-games
 * @desc Manually trigger game sync
 */
router.post('/sync-games', verifyToken, isAdmin, async (req, res) => {
    try {
        const { force } = req.body;
        const result = await gameSyncService.syncAllGames(force);
        res.json(result);
    } catch (error) {
        console.error('Admin sync error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route GET /api/admin/sync-status
 * @desc Get current sync status
 */
router.get('/sync-status', verifyToken, isAdmin, async (req, res) => {
    try {
        const devGames = await gameSyncService.getDevGames();
        const status = {};

        for (const slug of Object.keys(devGames)) {
            const cached = gameSyncService.syncCache.get(slug);
            status[slug] = {
                lastSync: cached?.lastSync || null,
                checksum: cached?.checksum || null
            };
        }

        res.json({
            success: true,
            games: devGames,
            syncStatus: status
        });
    } catch (error) {
        console.error('Status error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route POST /api/admin/sync-db
 * @desc Sync database (placeholder for future)
 */
router.post('/sync-db', verifyToken, isAdmin, async (req, res) => {
    try {
        // Placeholder for database sync logic
        res.json({ success: true, message: 'DB sync not implemented yet' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
