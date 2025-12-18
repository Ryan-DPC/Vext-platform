const mongoose = require('mongoose');

const gameCategorySchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        name: {
            type: String,
            required: true,
            trim: true
        },
        icon: {
            type: String,
            default: '📁'
        },
        games: [{
            type: String // Game keys/slugs
        }],
        created_at: {
            type: Date,
            default: Date.now
        }
    },
    {
        timestamps: true
    }
);

// Index for faster queries
gameCategorySchema.index({ user_id: 1, name: 1 });

module.exports = mongoose.model('GameCategory', gameCategorySchema);
