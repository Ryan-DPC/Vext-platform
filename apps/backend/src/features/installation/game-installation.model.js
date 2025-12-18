const mongoose = require('mongoose');

const gameInstallationSchema = new mongoose.Schema(
    {
        user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        game_id: { type: mongoose.Schema.Types.Mixed, required: true, index: true }, // Can be ObjectId (Mongo) or String (Cloudinary)
        version: { type: String, required: true }, // e.g., "1.2.3"
        local_path: { type: String, required: true }, // e.g., "C:/Games/Ether/spludbuster"
        status: {
            type: String,
            enum: ['installed', 'installing', 'pending_update', 'updating', 'failed'],
            default: 'installed'
        },
        last_checked: { type: Date, default: Date.now }, // Last version check
        installed_at: { type: Date, default: Date.now },
        error_message: { type: String, default: null }, // Store error if status is 'failed'
    },
    { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// Compound index to ensure one installation per user per game
gameInstallationSchema.index({ user_id: 1, game_id: 1 }, { unique: true });

module.exports = mongoose.models.GameInstallation || mongoose.model('GameInstallation', gameInstallationSchema);
