const mongoose = require('mongoose');

const gameKeySchema = new mongoose.Schema(
    {
        game_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Game', required: true, index: true },
        key: { type: String, required: true, unique: true, index: true },
        created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        used_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        used_at: { type: Date, default: null },
        purpose: { type: String, enum: ['purchase', 'dev', 'streamer', 'external', 'promo'], default: 'purchase' },
        is_used: { type: Boolean, default: false },
    },
    { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

module.exports = mongoose.models.GameKey || mongoose.model('GameKey', gameKeySchema);
