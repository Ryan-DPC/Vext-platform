const mongoose = require('mongoose');

const userSettingsSchema = new mongoose.Schema(
    {
        user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
        install_path: { type: String, default: null }, // e.g., "C:/Games/Ether"
    },
    { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

module.exports = mongoose.models.UserSettings || mongoose.model('UserSettings', userSettingsSchema);
