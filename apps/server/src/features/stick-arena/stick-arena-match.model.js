const mongoose = require('mongoose');

const stickArenaMatchSchema = new mongoose.Schema({
    winnerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    loserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    winnerScore: { type: Number, default: 0 },
    loserScore: { type: Number, default: 0 },
    duration: { type: Number, default: 0 }, // in seconds
    playedAt: { type: Date, default: Date.now }
}, {
    timestamps: true
});

// Index for querying matches by user
stickArenaMatchSchema.index({ winnerId: 1, playedAt: -1 });
stickArenaMatchSchema.index({ loserId: 1, playedAt: -1 });

module.exports = mongoose.model('StickArenaMatch', stickArenaMatchSchema);
