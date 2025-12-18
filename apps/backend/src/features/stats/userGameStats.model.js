const mongoose = require('mongoose');

const userGameStatsSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    gameId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Game',
        required: true,
        index: true
    },
    totalPlaytime: {
        type: Number,
        default: 0 // In seconds
    },
    lastPlayed: {
        type: Date,
        default: null
    },
    installDate: {
        type: Date,
        default: Date.now
    },
    achievements: [{
        id: String,
        unlockedAt: Date,
        name: String,
        description: String
    }],
    // Generic stats object for game-specific metrics (kills, wins, etc.)
    stats: {
        type: Map,
        of: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true
});

// Compound index for unique user-game pair
userGameStatsSchema.index({ userId: 1, gameId: 1 }, { unique: true });

const UserGameStats = mongoose.model('UserGameStats', userGameStatsSchema);

module.exports = UserGameStats;
