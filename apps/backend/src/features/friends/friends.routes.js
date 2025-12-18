const express = require('express');
const router = express.Router();
const FriendsController = require('./friends.controller');
const auth = require('../../middleware/auth');

// Routes protégées
router.post('/add', auth, FriendsController.addFriendRequest);
router.post('/accept', auth, FriendsController.acceptFriendRequest);
router.post('/reject/:id', auth, FriendsController.rejectFriendRequest);
router.delete('/:friendId', auth, FriendsController.removeFriend);
router.get('/list', auth, FriendsController.getFriends);
router.get('/requests', auth, FriendsController.getFriendRequests);

module.exports = router;
