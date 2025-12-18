const FriendModel = require('./friends.model');
const mongoose = require('mongoose');

class FriendsService {
    static async sendFriendRequest(userId, friendId) {
        // Vérifier si une relation existe déjà
        const existing = await FriendModel.findOne({
            user_id: userId,
            friend_id: friendId
        });

        if (existing) {
            if (existing.status === 'accepted') {
                throw new Error('Vous êtes déjà amis.');
            } else if (existing.status === 'pending') {
                throw new Error('Une demande d\'ami est déjà en attente.');
            }
            // Si rejected, on peut peut-être permettre de renvoyer ? Pour l'instant on bloque.
            throw new Error('Une demande d\'ami existe déjà.');
        }

        // Vérifier si l'autre utilisateur a déjà envoyé une demande (cas croisé)
        const reverseRequest = await FriendModel.findOne({
            user_id: friendId,
            friend_id: userId
        });

        if (reverseRequest) {
            if (reverseRequest.status === 'pending') {
                // Accepter automatiquement si l'autre a déjà demandé
                return await this.acceptFriendRequest(reverseRequest._id);
            } else if (reverseRequest.status === 'accepted') {
                throw new Error('Vous êtes déjà amis.');
            }
        }

        const doc = await FriendModel.create({ user_id: userId, friend_id: friendId, status: 'pending' });
        return doc._id.toString();
    }

    static async acceptFriendRequest(requestId) {
        const update = await FriendModel.updateOne({ _id: requestId }, { $set: { status: 'accepted' } });
        if (update.modifiedCount === 0) throw new Error('Aucune demande trouvée avec cet ID.');

        const row = await FriendModel.findById(requestId, { user_id: 1, friend_id: 1 }).lean();
        if (!row) throw new Error('Relation utilisateur non trouvée.');

        // Créer la relation réciproque si inexistante
        await FriendModel.updateOne(
            { user_id: row.friend_id, friend_id: row.user_id },
            { $setOnInsert: { status: 'accepted' } },
            { upsert: true }
        );
        return 1;
    }

    static async rejectFriendRequest(requestId, userId) {
        // Vérifier que la demande est bien destinée à cet utilisateur (friend_id = userId)
        const res = await FriendModel.updateOne({ _id: requestId, friend_id: userId }, { $set: { status: 'rejected' } });
        if (res.modifiedCount === 0) {
            throw new Error('Impossible de refuser la demande d\'ami. Demande introuvable ou non autorisée.');
        }
        return res.modifiedCount;
    }

    static async removeFriend(userId, friendId) {
        const res = await FriendModel.deleteMany({
            $or: [
                { user_id: userId, friend_id: friendId },
                { user_id: friendId, friend_id: userId },
            ],
        });
        return res.deletedCount;
    }

    static async getFriends(userId) {
        const rows = await FriendModel.find({ user_id: userId, status: 'accepted' })
            .populate('friend_id', { username: 1, profile_pic: 1, socket_id: 1 })
            .lean();
        return rows.map((r) => ({
            id: r.friend_id._id.toString(),
            username: r.friend_id.username,
            profile_pic: r.friend_id.profile_pic, // Standardize to profile_pic
            status: r.friend_id.socket_id ? 'online' : 'offline' // Determine status
        }));
    }

    static async getFriendRequests(userId) {
        const rows = await FriendModel.find({ friend_id: userId, status: 'pending' })
            .populate('user_id', { username: 1, profile_pic: 1 })
            .lean();
        return rows.map((r) => ({
            request_id: r._id.toString(),
            user_id: r.user_id._id.toString(),
            username: r.user_id.username,
            profile_pic: r.user_id.profile_pic
        }));
    }
}

module.exports = FriendsService;
