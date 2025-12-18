const StickArenaStatsService = require('./stick-arena-stats.service');

class StickArenaStatsController {
    // Get current user's stats
    async getMyStats(req, res) {
        try {
            const userId = req.user._id;
            const stats = await StickArenaStatsService.getOrCreateStats(userId);

            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // Get leaderboard
    async getLeaderboard(req, res) {
        try {
            const { sortBy = 'ranking', limit = 100 } = req.query;
            const leaderboard = await StickArenaStatsService.getLeaderboard(sortBy, parseInt(limit));

            res.json({
                success: true,
                count: leaderboard.length,
                data: leaderboard
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // Get user rank
    async getMyRank(req, res) {
        try {
            const userId = req.user._id;
            const rankData = await StickArenaStatsService.getUserRank(userId);

            res.json({
                success: true,
                data: rankData
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // Get top players
    async getTopPlayers(req, res) {
        try {
            const { limit = 10 } = req.query;
            const topPlayers = await StickArenaStatsService.getTopPlayers(parseInt(limit));

            res.json({
                success: true,
                data: topPlayers
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // Get specific user's stats (by ID)
    async getUserStats(req, res) {
        try {
            const { userId } = req.params;
            const stats = await StickArenaStatsService.getOrCreateStats(userId);

            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
}

module.exports = new StickArenaStatsController();
