const mongoose = require('mongoose');
const crypto = require('crypto');

const gameOwnershipSchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        game_key: {
            type: String,
            required: true,
            index: true
        },
        game_name: {
            type: String,
            required: true
        },
        purchase_price: {
            type: Number,
            default: 0
        },
        purchase_date: {
            type: Date,
            default: Date.now
        },
        is_manual_add: {
            type: Boolean,
            default: false
        },
        // Marketplace fields
        for_sale: {
            type: Boolean,
            default: false,
            index: true
        },
        asking_price: {
            type: Number
        },
        listed_at: {
            type: Date
        },
        ownership_token: {
            type: String,
            unique: true,
            sparse: true // Only unique if not null
        },
        // Game reference (can be null for manual games)
        game_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Game',
            default: null,
            index: true
        },
        // Additional ownership fields
        current_price: {
            type: Number,
            default: null
        },
        status: {
            type: String,
            enum: ['owned', 'listed_for_sale'],
            default: 'owned'
        },
        is_resellable: {
            type: Boolean,
            default: true
        },
        game_type: {
            type: String,
            enum: ['web', 'exe'],
            default: 'web'
        },
        // Fields for custom .exe games
        exe_path: {
            type: String,
            default: null
        },
        game_description: {
            type: String,
            default: null
        },
        // Game state
        installed: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

// Compound indexes for queries
gameOwnershipSchema.index({ user_id: 1, game_key: 1 }, { unique: true });
gameOwnershipSchema.index({ for_sale: 1, asking_price: 1 });
gameOwnershipSchema.index({ for_sale: 1, listed_at: -1 }); // Optimized for "Newest Arrivals" sort

// Generate unique ownership token before save
gameOwnershipSchema.pre('save', function (next) {
    if (!this.ownership_token) {
        this.ownership_token = crypto.randomBytes(16).toString('hex');
    }
    next();
});

// Prevent OverwriteModelError
module.exports = mongoose.models.GameOwnership || mongoose.model('GameOwnership', gameOwnershipSchema);
