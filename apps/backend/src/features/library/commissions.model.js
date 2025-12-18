const mongoose = require('mongoose');

const commissionSchema = new mongoose.Schema(
    {
        transaction_id: { type: String, required: true },
        recipient_type: { type: String, enum: ['platform', 'developer'], required: true },
        recipient_id: { type: String, default: null },
        amount: { type: Number, required: true },
        percentage: { type: Number, required: true },
    },
    { timestamps: true }
);

module.exports = mongoose.models.Commission || mongoose.model('Commission', commissionSchema);
