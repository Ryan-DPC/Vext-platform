const ReviewsService = require('./reviews.service');

class ReviewsController {
    static async addReview(req, res) {
        try {
            const { gameId } = req.params;
            const { rating, content } = req.body;
            const userId = req.user.id;

            const review = await ReviewsService.addReview(userId, gameId, rating, content);
            res.status(201).json(review);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    }

    static async getReviews(req, res) {
        try {
            const { gameId } = req.params;
            const reviews = await ReviewsService.getGameReviews(gameId);
            res.json(reviews);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}
module.exports = ReviewsController;
