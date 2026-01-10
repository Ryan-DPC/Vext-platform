const express = require('express');
const router = express.Router();
const ChatController = require('./chat.controller');
const auth = require('../../middleware/auth');

// Routes protégées
router.post('/send', auth, ChatController.sendMessage);
router.get('/inbox', auth, ChatController.getInbox);
router.get('/conversation/:otherUserId', auth, ChatController.getConversation);
router.post('/mark-read/:messageId', auth, ChatController.markAsRead);
router.get('/unread-count', auth, ChatController.getUnreadCount);
router.get('/conversations', auth, ChatController.getConversationsList);

module.exports = router;
