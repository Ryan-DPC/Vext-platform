const FriendsService = require('./friends.service');

class FriendsController {
    static async addFriendRequest(req, res) {
        try {
            const userId = req.user.id;
            const { friendId } = req.body;

            if (!friendId) {
                return res.status(400).json({ success: false, message: 'ID de l\'ami requis.' });
            }

            if (userId === friendId) {
                return res.status(400).json({ success: false, message: 'Vous ne pouvez pas vous ajouter vous-même.' });
            }

            await FriendsService.sendFriendRequest(userId, friendId);
            res.status(201).json({ success: true, message: 'Demande d\'ami envoyée.' });
        } catch (error) {
            console.error('Erreur lors de l\'ajout d\'un ami :', error);
            res.status(400).json({ success: false, message: error.message });
        }
    }

    static async acceptFriendRequest(req, res) {
        try {
            const { requestId } = req.body;
            if (!requestId) {
                return res.status(400).json({ success: false, message: 'ID de demande invalide.' });
            }

            const result = await FriendsService.acceptFriendRequest(requestId);
            res.status(200).json({ success: true, changes: result });
        } catch (error) {
            console.error('Erreur lors de l\'acceptation de la demande :', error);
            res.status(400).json({ success: false, message: error.message });
        }
    }

    static async rejectFriendRequest(req, res) {
        try {
            const userId = req.user.id;
            const requestId = req.params.id;

            if (!requestId) {
                return res.status(400).json({ success: false, message: 'ID de demande requis.' });
            }

            await FriendsService.rejectFriendRequest(requestId, userId);
            res.status(200).json({ success: true, message: 'Demande d\'ami rejetée avec succès.' });
        } catch (error) {
            console.error('Erreur lors du rejet de la demande d\'ami :', error);
            res.status(400).json({ success: false, message: error.message });
        }
    }

    static async removeFriend(req, res) {
        try {
            const userId = req.user.id;
            const friendId = req.params.friendId;

            if (!friendId) {
                return res.status(400).json({ success: false, message: 'ID de l\'ami requis.' });
            }

            await FriendsService.removeFriend(userId, friendId);
            res.status(200).json({ success: true, message: 'Ami supprimé avec succès.' });
        } catch (error) {
            console.error('Erreur lors de la suppression de l\'ami :', error);
            res.status(400).json({ success: false, message: error.message });
        }
    }

    static async getFriends(req, res) {
        try {
            const userId = req.user.id;
            const friends = await FriendsService.getFriends(userId);
            res.status(200).json({ success: true, friends });
        } catch (error) {
            console.error('Erreur lors de la récupération des amis :', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async getFriendRequests(req, res) {
        try {
            const userId = req.user.id;
            const requests = await FriendsService.getFriendRequests(userId);
            res.status(200).json({ success: true, requests });
        } catch (error) {
            console.error('Erreur lors de la récupération des demandes d\'amis :', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }
}

module.exports = FriendsController;
