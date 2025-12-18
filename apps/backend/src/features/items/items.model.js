const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        description: { type: String, default: '' },
        price: { type: Number, default: 0 },
        image_url: { type: String, default: '' },
        game_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Game', default: null, index: true }, // Jeu associé (optionnel)
        item_type: { type: String, enum: ['badge', 'banner', 'profile_picture', 'avatar_frame', 'background', 'other'], default: 'other' }, // Type d'item cosmétique
        rarity: { type: String, enum: ['common', 'rare', 'epic', 'legendary'], default: 'common' }, // Rareté de l'item
        cloudinary_id: { type: String, default: null, index: true }, // ID Cloudinary pour sync
        is_archived: { type: Boolean, default: false, index: true }, // Soft delete pour garder l'historique (Point "Vintage")
        created_at: { type: Date, default: Date.now },
    },
    { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// Index textuel pour la recherche performante
itemSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.models.Item || mongoose.model('Item', itemSchema);
