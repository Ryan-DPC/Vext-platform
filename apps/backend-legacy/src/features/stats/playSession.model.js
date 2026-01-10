const mongoose = require('mongoose');

const playSessionSchema = new mongoose.Schema({
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
    startTime: {
        type: Date,
        required: true,
        default: Date.now
    },
    endTime: {
        type: Date
    },
    duration: {
        type: Number, // In seconds
        default: 0
    },
    // Device/Platform metadata if needed later
    platform: {
        type: String,
        default: 'desktop'
    }
}, {
    timestamps: true
});

// Index for efficiently querying sessions by date range (activity graph)
playSessionSchema.index({ userId: 1, startTime: -1 });

const PlaySession = mongoose.model('PlaySession', playSessionSchema);

module.exports = PlaySession;
