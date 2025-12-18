const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
    {
        from_user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        to_user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        content: { type: String, required: true },
        read_at: { type: Date, default: null },
    },
    { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

module.exports = mongoose.models.Message || mongoose.model('Message', messageSchema);
