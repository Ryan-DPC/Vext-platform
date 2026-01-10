const express = require('express');
const router = express.Router({ mergeParams: true });
const ReviewsController = require('./reviews.controller');
const authMiddleware = require('../../middleware/auth');

router.get('/', ReviewsController.getReviews);
router.post('/', authMiddleware, ReviewsController.addReview);

module.exports = router;
