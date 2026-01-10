const mongoose = require('mongoose');

const persistentLobbySchema = new mongoose.Schema(
    {
        code: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            minlength: 6,
            maxlength: 6,
            index: true
        },
        players: [{
            username: {
                type: String,
                required: true
            },
            token: {
                type: String,
                required: true
            },
            joinedAt: {
                type: Date,
                default: Date.now
            }
        }],
        status: {
            type: String,
            enum: ['waiting', 'in-game', 'finished'],
            default: 'waiting',
            index: true
        },
        maxPlayers: {
            type: Number,
            default: 4,
            min: 2,
            max: 10
        },
        createdBy: {
            type: String, // username of creator
            required: true
        },
        gameData: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },
        matchScores: [{
            username: String,
            score: Number,
            timestamp: {
                type: Date,
                default: Date.now
            }
        }]
    },
    {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at'
        }
    }
);

// Index for finding active lobbies
persistentLobbySchema.index({ status: 1, created_at: -1 });

// Auto-delete finished lobbies after 24 hours
persistentLobbySchema.index(
    { created_at: 1 },
    {
        expireAfterSeconds: 86400, // 24 hours
        partialFilterExpression: { status: 'finished' }
    }
);

module.exports = mongoose.models.PersistentLobby || mongoose.model('PersistentLobby', persistentLobbySchema);
