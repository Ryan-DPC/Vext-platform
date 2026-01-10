const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    game_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Game', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    content: { type: String, required: true, maxlength: 1000 },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// Ensure unique review per user per game
reviewSchema.index({ user_id: 1, game_id: 1 }, { unique: true });

const ReviewModel = mongoose.model('Review', reviewSchema);

class Reviews {
    static async create(data) {
        return await ReviewModel.create(data);
    }
    static async findByGame(gameId) {
        return await ReviewModel.find({ game_id: gameId })
            .populate('user_id', 'username profile_pic')
            .sort({ created_at: -1 })
            .lean();
    }
    static async findByUserAndGame(userId, gameId) {
        return await ReviewModel.findOne({ user_id: userId, game_id: gameId }).lean();
    }
}

module.exports = Reviews;
