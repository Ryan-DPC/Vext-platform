const UserGameStats = require('./userGameStats.model');
const PlaySession = require('./playSession.model');
const Games = require('../games/games.model');

class StatsController {

    // --- Session Management ---

    static async startSession(req, res) {
        try {
            const userId = req.user.id;
            const { gameId } = req.body;

            if (!gameId) return res.status(400).json({ message: 'Missing gameId' });

            const session = await PlaySession.create({
                userId,
                gameId,
                startTime: new Date()
            });

            // Ensure UserGameStats entry exists
            await UserGameStats.updateOne(
                { userId, gameId },
                { $setOnInsert: { installDate: new Date() } },
                { upsert: true }
            );

            res.json({ sessionId: session._id, startTime: session.startTime });
        } catch (error) {
            console.error('Start Session Error:', error);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    static async endSession(req, res) {
        try {
            const { sessionId } = req.body;
            if (!sessionId) return res.status(400).json({ message: 'Missing sessionId' });

            const session = await PlaySession.findById(sessionId);
            if (!session) return res.status(404).json({ message: 'Session not found' });
            if (session.endTime) return res.json({ message: 'Session already ended', duration: session.duration });

            const endTime = new Date();
            const duration = Math.round((endTime - session.startTime) / 1000); // Seconds

            session.endTime = endTime;
            session.duration = duration;
            await session.save();

            // Update user total playtime for this game
            await UserGameStats.updateOne(
                { userId: session.userId, gameId: session.gameId },
                {
                    $inc: { totalPlaytime: duration },
                    $set: { lastPlayed: endTime }
                }
            );

            res.json({ success: true, duration });
        } catch (error) {
            console.error('End Session Error:', error);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    // --- Statistics Aggregation ---

    static async getGlobalStats(req, res) {
        try {
            const userId = req.user.id;

            // 1. Total Playtime across all games
            const totalStats = await UserGameStats.aggregate([
                { $match: { userId: newToObject(userId) } },
                { $group: { _id: null, totalSeconds: { $sum: '$totalPlaytime' } } }
            ]);
            const totalHours = totalStats.length ? (totalStats[0].totalSeconds / 3600).toFixed(1) : 0;

            // 2. Top 3 Most Played Games
            const topGamesDocs = await UserGameStats.find({ userId })
                .sort({ totalPlaytime: -1 })
                .limit(3)
                .populate('gameId', 'game_name image_url')
                .lean();

            const topGames = topGamesDocs.map(doc => ({
                id: doc.gameId._id,
                name: doc.gameId.game_name,
                image: doc.gameId.image_url,
                hours: (doc.totalPlaytime / 3600).toFixed(1)
            }));

            // 3. Activity Heatmap (Sessions per Day of Week / Hour)
            // Aggregating last 30 days of sessions
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const sessions = await PlaySession.find({
                userId,
                startTime: { $gte: thirtyDaysAgo }
            }).select('startTime duration').lean();

            // Transform for heatmap (e.g., array of { date, count } or day/hour distribution)
            // For Chart.js heatmap or bar chart, let's return last 7 days daily playtime
            const last7Days = {};
            for (let i = 0; i < 7; i++) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const dateKey = d.toISOString().split('T')[0];
                last7Days[dateKey] = 0;
            }

            sessions.forEach(s => {
                const dateKey = s.startTime.toISOString().split('T')[0];
                if (last7Days[dateKey] !== undefined) {
                    last7Days[dateKey] += (s.duration / 3600); // Add hours
                }
            });

            const activityData = Object.entries(last7Days).map(([date, hours]) => ({ date, hours: hours.toFixed(2) })).reverse();

            res.json({
                totalHours,
                topGames,
                activityData
            });

        } catch (error) {
            console.error('Get Global Stats Error:', error);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    static async getGameStats(req, res) {
        try {
            const userId = req.user.id;
            const { gameId } = req.params;

            const stats = await UserGameStats.findOne({ userId, gameId }).lean();
            if (!stats) return res.json({ totalPlaytime: 0, lastPlayed: null });

            res.json({
                totalPlaytime: stats.totalPlaytime,
                lastPlayed: stats.lastPlayed,
                achievements: stats.achievements || []
            });
        } catch (error) {
            console.error('Get Game Stats Error:', error);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    }
}

// Helper for ObjectId casting if needed for aggregation
const mongoose = require('mongoose');
function newToObject(id) { return new mongoose.Types.ObjectId(id); }

module.exports = StatsController;
