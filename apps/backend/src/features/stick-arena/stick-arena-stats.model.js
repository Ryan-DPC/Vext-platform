const mongoose = require('mongoose');

const stickArenaStatsSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    gamesPlayed: {
        type: Number,
        default: 0
    },
    wins: {
        type: Number,
        default: 0
    },
    losses: {
        type: Number,
        default: 0
    },
    kills: {
        type: Number,
        default: 0
    },
    deaths: {
        type: Number,
        default: 0
    },
    totalDamageDealt: {
        type: Number,
        default: 0
    },
    totalDamageTaken: {
        type: Number,
        default: 0
    },
    powerupsCollected: {
        type: Number,
        default: 0
    },
    favoriteWeapon: {
        type: String,
        enum: ['SWORD', 'BOW', 'GUN'],
        default: 'SWORD'
    },
    winStreak: {
        type: Number,
        default: 0
    },
    bestWinStreak: {
        type: Number,
        default: 0
    },
    ranking: {
        type: Number,
        default: 1000 // ELO-style ranking
    },
    lastPlayed: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Calculate win rate
stickArenaStatsSchema.virtual('winRate').get(function () {
    if (this.gamesPlayed === 0) return 0;
    return ((this.wins / this.gamesPlayed) * 100).toFixed(2);
});

// Calculate K/D ratio
stickArenaStatsSchema.virtual('kdRatio').get(function () {
    if (this.deaths === 0) return this.kills;
    return (this.kills / this.deaths).toFixed(2);
});

// Ensure virtuals are included in JSON
stickArenaStatsSchema.set('toJSON', { virtuals: true });
stickArenaStatsSchema.set('toObject', { virtuals: true });

// Index for leaderboard queries
stickArenaStatsSchema.index({ ranking: -1 });
stickArenaStatsSchema.index({ wins: -1 });
stickArenaStatsSchema.index({ winStreak: -1 });

module.exports = mongoose.model('StickArenaStats', stickArenaStatsSchema);
