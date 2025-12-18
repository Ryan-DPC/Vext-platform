const StickArenaStats = require('./stick-arena-stats.model');
const StickArenaMatch = require('./stick-arena-match.model');

class StickArenaStatsService {
    // Get or create stats for a user
    async getOrCreateStats(userId) {
        try {
            let stats = await StickArenaStats.findOne({ userId }).populate('userId', 'username email');

            if (!stats) {
                stats = await StickArenaStats.create({ userId });
                stats = await StickArenaStats.findById(stats._id).populate('userId', 'username email');
            }

            return stats;
        } catch (error) {
            throw new Error(`Error getting stats: ${error.message}`);
        }
    }

    // Update stats after a match
    async updateMatchStats(userId, matchData) {
        try {
            const stats = await this.getOrCreateStats(userId);

            // Update basic stats
            stats.gamesPlayed += 1;
            stats.lastPlayed = new Date();

            if (matchData.won) {
                stats.wins += 1;
                stats.winStreak += 1;
                if (stats.winStreak > stats.bestWinStreak) {
                    stats.bestWinStreak = stats.winStreak;
                }
                // Update ranking (simple ELO-like system)
                stats.ranking += 25;
            } else {
                stats.losses += 1;
                stats.winStreak = 0;
                stats.ranking = Math.max(0, stats.ranking - 15);
            }

            // Update combat stats
            if (matchData.kills) stats.kills += matchData.kills;
            if (matchData.deaths) stats.deaths += matchData.deaths;
            if (matchData.damageDealt) stats.totalDamageDealt += matchData.damageDealt;
            if (matchData.damageTaken) stats.totalDamageTaken += matchData.damageTaken;
            if (matchData.powerupsCollected) stats.powerupsCollected += matchData.powerupsCollected;
            if (matchData.weaponUsed) stats.favoriteWeapon = matchData.weaponUsed;

            await stats.save();
            return stats;
        } catch (error) {
            throw new Error(`Error updating stats: ${error.message}`);
        }
    }

    // Get leaderboard
    async getLeaderboard(sortBy = 'ranking', limit = 100) {
        try {
            const sortOptions = {
                ranking: { ranking: -1 },
                wins: { wins: -1 },
                winRate: { wins: -1, gamesPlayed: -1 },
                winStreak: { bestWinStreak: -1 },
                kills: { kills: -1 }
            };

            const sort = sortOptions[sortBy] || sortOptions.ranking;

            const leaderboard = await StickArenaStats.find()
                .populate('userId', 'username email')
                .sort(sort)
                .limit(limit)
                .lean();

            // Add ranking position
            return leaderboard.map((entry, index) => ({
                ...entry,
                position: index + 1
            }));
        } catch (error) {
            throw new Error(`Error fetching leaderboard: ${error.message}`);
        }
    }

    // Get user rank
    async getUserRank(userId) {
        try {
            const userStats = await this.getOrCreateStats(userId);

            const higherRanked = await StickArenaStats.countDocuments({
                ranking: { $gt: userStats.ranking }
            });

            return {
                rank: higherRanked + 1,
                stats: userStats
            };
        } catch (error) {
            throw new Error(`Error getting user rank: ${error.message}`);
        }
    }

    // Get top players
    async getTopPlayers(limit = 10) {
        try {
            return await StickArenaStats.find()
                .populate('userId', 'username email')
                .sort({ ranking: -1 })
                .limit(limit)
                .select('userId wins losses ranking winRate kdRatio bestWinStreak')
                .lean();
        } catch (error) {
            throw new Error(`Error getting top players: ${error.message}`);
        }
    }

    // Reset streak (called when user loses)
    async resetStreak(userId) {
        try {
            await StickArenaStats.updateOne(
                { userId },
                { $set: { winStreak: 0 } }
            );
        } catch (error) {
            throw new Error(`Error resetting streak: ${error.message}`);
        }
    }

    // Record a match result
    async recordMatch(matchData) {
        try {
            // Create match record
            const match = await StickArenaMatch.create({
                winnerId: matchData.winnerId,
                loserId: matchData.loserId,
                winnerScore: matchData.winnerScore,
                loserScore: matchData.loserScore,
                duration: matchData.duration
            });

            // Update stats for winner
            await this.updateMatchStats(matchData.winnerId, {
                won: true,
                ...matchData.winnerStats
            });

            // Update stats for loser
            await this.updateMatchStats(matchData.loserId, {
                won: false,
                ...matchData.loserStats
            });

            return match;
        } catch (error) {
            console.error('Error recording match:', error);
            // Don't throw, just log error so game doesn't crash
        }
    }

    // Get match history
    async getMatchHistory(userId, limit = 10) {
        try {
            return await StickArenaMatch.find({
                $or: [{ winnerId: userId }, { loserId: userId }]
            })
                .populate('winnerId', 'username')
                .populate('loserId', 'username')
                .sort({ playedAt: -1 })
                .limit(limit)
                .lean();
        } catch (error) {
            throw new Error(`Error getting match history: ${error.message}`);
        }
    }
}

module.exports = new StickArenaStatsService();
