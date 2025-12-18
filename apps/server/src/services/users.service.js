const Users = require('../models/user.model');

class UsersService {
    static async saveSocketId(userId, socketId) {
        if (userId === 'backend-service') return;
        return Users.saveSocketId(userId, socketId);
    }

    static async getUserBySocketId(socketId) {
        return Users.getUserBySocketId(socketId);
    }

    static async removeSocketId(socketId) {
        return Users.removeSocketId(socketId);
    }

    static async getFriends(userId) {
        if (userId === 'backend-service') return [];
        return Users.getFriends(userId);
    }
}

module.exports = UsersService;
