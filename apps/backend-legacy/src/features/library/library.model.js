const mongoose = require('mongoose');

const ownershipSchema = new mongoose.Schema(
    {
        user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        game_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Game', default: null, index: true },
        game_key: { type: String, required: true, unique: true, index: true }, // Token blockchain unique pour ce jeu
        ownership_token: { type: String, default: null }, // Alias/déprécié, on utilise game_key maintenant
        purchase_price: { type: Number, required: true },
        current_price: { type: Number, default: null },
        status: { type: String, enum: ['owned', 'listed_for_sale'], default: 'owned' },
        installed: { type: Boolean, default: false },
        is_resellable: { type: Boolean, default: true },
        game_type: { type: String, enum: ['web', 'exe'], default: 'web' },
        is_manual_add: { type: Boolean, default: false }, // True si ajouté manuellement via game_key externe
        // Champs pour les jeux .exe personnalisés
        exe_path: { type: String, default: null },
        game_name: { type: String, default: null },
        game_description: { type: String, default: null },
    },
    { timestamps: { createdAt: 'purchase_date', updatedAt: 'updated_at' } }
);

// Index composé pour empêcher d'avoir le même jeu plusieurs fois pour le même utilisateur
ownershipSchema.index({ user_id: 1, game_id: 1, status: 1 }, { unique: false });

module.exports = mongoose.models.GameOwnership || mongoose.model('GameOwnership', ownershipSchema);
