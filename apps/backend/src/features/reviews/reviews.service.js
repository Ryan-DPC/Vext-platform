const Reviews = require('./review.model');
const Games = require('../games/games.model');

class ReviewsService {
    static async addReview(userId, gameId, rating, content) {
        // Resolve Game ID (could be 'EtherChess' slug or ObjectId)
        const game = await Games.findGameByIdOrSlug(gameId);
        if (!game) throw new Error('Game not found');

        const resolvedGameId = game._id;

        // Check if already reviewed
        const existing = await Reviews.findByUserAndGame(userId, resolvedGameId);
        if (existing) throw new Error('You have already reviewed this game');

        return await Reviews.create({ user_id: userId, game_id: resolvedGameId, rating, content });
    }

    static async getGameReviews(gameId) {
        // Resolve Game ID
        const game = await Games.findGameByIdOrSlug(gameId);
        if (!game) {
            return []; // Or throw error? Returning empty array is safer for UI.
        }

        const reviews = await Reviews.findByGame(game._id);
        // Transform populate result if necessary, generally nice to return flat structure or keep as is
        return reviews.map(r => ({
            id: r._id,
            user: {
                id: r.user_id._id,
                username: r.user_id.username,
                profile_pic: r.user_id.profile_pic
            },
            rating: r.rating,
            content: r.content,
            created_at: r.created_at
        }));
    }
}
module.exports = ReviewsService;
