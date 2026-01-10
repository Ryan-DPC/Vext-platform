const express = require('express');
const router = express.Router();
const UsersController = require('./users.controller');
const verifyToken = require('../../middleware/auth');
const upload = require('../../middleware/upload.middleware');

router.post('/avatar', verifyToken, upload.single('avatar'), UsersController.uploadAvatar);
router.get('/me', verifyToken, UsersController.getUserProfile);
router.put('/me', verifyToken, UsersController.updateProfile);
router.get('/search', verifyToken, UsersController.searchUsers);
router.get('/recent-games', verifyToken, UsersController.getRecentGames);
router.get('/wishlist', verifyToken, UsersController.getWishlist);
router.post('/wishlist', verifyToken, UsersController.addToWishlist);
router.delete('/wishlist/:gameId', verifyToken, UsersController.removeFromWishlist);
router.get('/:userId/elo', verifyToken, UsersController.getUserElo);
router.put('/elo', verifyToken, UsersController.updateUserElo);
router.get('/:userId', verifyToken, UsersController.getPublicProfile); // Must be last!

module.exports = router;
