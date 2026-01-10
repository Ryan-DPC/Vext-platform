const mongoose = require('mongoose');

const gameSessionSchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        game_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Game',
            required: false, // Optionnel pour les jeux .exe manuels qui n'ont pas de game_id dans MongoDB
            default: null,
            index: true
        },
        game_folder_name: {
            type: String,
            required: true
        },
        ownership_token: {
            type: String,
            required: true
        },
        session_token: {
            type: String,
            required: true,
            unique: true,
            index: true
        },
        started_at: {
            type: Date,
            default: Date.now,
            index: true
        },
        last_heartbeat: {
            type: Date,
            default: Date.now
        },
        status: {
            type: String,
            enum: ['active', 'ended', 'timeout'],
            default: 'active',
            index: true
        },
        process_id: {
            type: Number,
            default: null,
            index: true
        }
    },
    { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// Index pour trouver rapidement les sessions actives d'un utilisateur
gameSessionSchema.index({ user_id: 1, status: 1 });

module.exports = mongoose.models.GameSession || mongoose.model('GameSession', gameSessionSchema);
