const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema(
    {
        game_key: { type: String, required: true, index: true }, // Clé de jeu = token blockchain
        ownership_token: { type: String, default: null }, // Alias pour compatibilité
        seller_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        game_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Game', required: true },
        asking_price: { type: Number, required: true },
        status: { type: String, enum: ['active', 'sold', 'cancelled'], default: 'active' },
    },
    { timestamps: { createdAt: 'listed_at', updatedAt: 'updated_at' } }
);

module.exports = mongoose.models.MarketplaceListing || mongoose.model('MarketplaceListing', listingSchema);
