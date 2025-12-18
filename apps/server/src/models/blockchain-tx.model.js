const mongoose = require('mongoose');

const blockchainTxSchema = new mongoose.Schema(
    {
        transaction_id: { type: String, required: true, unique: true },
        from_address: { type: String, required: true },
        to_address: { type: String, required: true },
        amount: { type: Number, required: true },
        transaction_type: { type: String, enum: ['game_purchase', 'game_sale', 'commission'], required: true },
        game_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Game', required: true },
        game_key: { type: String, required: true }, // Clé de jeu = token blockchain
        ownership_token: { type: String, default: null }, // Alias pour compatibilité
        timestamp: { type: Date, default: Date.now },
    },
    { timestamps: false }
);

module.exports = mongoose.models.BlockchainTx || mongoose.model('BlockchainTx', blockchainTxSchema);
