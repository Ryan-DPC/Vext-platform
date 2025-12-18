const mongoose = require('mongoose');

const userItemSchema = new mongoose.Schema(
    {
        user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        item_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true, index: true },
        purchased_at: { type: Date, default: Date.now },
        is_equipped: { type: Boolean, default: false }, // Pour les items équipables (PDP, etc.)
        user_image_url: { type: String, default: null }, // URL Cloudinary dans users/{userId}/inventaire/
    },
    { timestamps: false }
);

// Index composé pour empêcher d'acheter le même item plusieurs fois
userItemSchema.index({ user_id: 1, item_id: 1 }, { unique: true });

module.exports = mongoose.models.UserItem || mongoose.model('UserItem', userItemSchema);
