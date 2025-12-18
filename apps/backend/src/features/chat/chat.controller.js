const ChatService = require('./chat.service');

class ChatController {
    static async sendMessage(req, res) {
        try {
            const fromUserId = req.user.id;
            const { toUserId, content } = req.body;

            if (!toUserId || !content) {
                return res.status(400).json({ success: false, message: 'Destinataire et contenu requis.' });
            }

            const message = await ChatService.sendMessage(fromUserId, toUserId, content);
            res.status(201).json({ success: true, message: 'Message envoyé.', data: message });
        } catch (error) {
            console.error('Erreur lors de l\'envoi du message :', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async getInbox(req, res) {
        try {
            const userId = req.user.id;
            const limit = parseInt(req.query.limit) || 50;

            const messages = await ChatService.getInbox(userId, limit);
            res.status(200).json({ success: true, messages });
        } catch (error) {
            console.error('Erreur lors de la récupération des messages :', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async getConversation(req, res) {
        try {
            const userId = req.user.id;
            const { otherUserId } = req.params;
            const limit = parseInt(req.query.limit) || 50;

            if (!otherUserId) {
                return res.status(400).json({ success: false, message: 'ID de l\'utilisateur requis.' });
            }

            const messages = await ChatService.getConversation(userId, otherUserId, limit);
            res.status(200).json({ success: true, messages });
        } catch (error) {
            console.error('Erreur lors de la récupération de la conversation :', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async markAsRead(req, res) {
        try {
            const userId = req.user.id;
            const { messageId } = req.params;

            if (!messageId) {
                return res.status(400).json({ success: false, message: 'ID du message requis.' });
            }

            await ChatService.markAsRead(messageId, userId);
            res.status(200).json({ success: true, message: 'Message marqué comme lu.' });
        } catch (error) {
            console.error('Erreur lors du marquage du message :', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async getUnreadCount(req, res) {
        try {
            const userId = req.user.id;
            const count = await ChatService.getUnreadCount(userId);
            res.status(200).json({ success: true, unread_count: count });
        } catch (error) {
            console.error('Erreur lors de la récupération du nombre de messages non lus :', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async getConversationsList(req, res) {
        try {
            const userId = req.user.id;
            const limit = parseInt(req.query.limit) || 20;

            const conversations = await ChatService.getConversationsList(userId, limit);
            res.status(200).json({ success: true, conversations });
        } catch (error) {
            console.error('Erreur lors de la récupération de la liste des conversations :', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }
}

module.exports = ChatController;
