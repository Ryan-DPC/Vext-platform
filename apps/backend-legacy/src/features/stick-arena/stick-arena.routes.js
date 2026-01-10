const express = require('express');
const router = express.Router();
const path = require('path');
const protect = require('../../middleware/auth');
const StickArenaStatsController = require('./stick-arena-stats.controller');

// Serve the stick fighting game files (public access)
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../../me/stick fighting/index.html'));
});

// Stats endpoints (require authentication)
router.get('/stats/me', protect, StickArenaStatsController.getMyStats);
router.get('/stats/rank', protect, StickArenaStatsController.getMyRank);
router.get('/stats/user/:userId', protect, StickArenaStatsController.getUserStats);

// Leaderboard endpoints (public access for viewing)
router.get('/leaderboard', StickArenaStatsController.getLeaderboard);
router.get('/leaderboard/top', StickArenaStatsController.getTopPlayers);

module.exports = router;
