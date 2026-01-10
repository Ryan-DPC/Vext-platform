import Users from '../models/user.model.ts';

export class UsersService {
    static async saveSocketId(userId: string, socketId: string) {
        if (userId === 'backend-service') return;
        // @ts-ignore
        return Users.saveSocketId(userId, socketId);
    }

    static async getUserBySocketId(socketId: string) {
        // @ts-ignore
        return Users.getUserBySocketId(socketId);
    }

    static async removeSocketId(socketId: string) {
        // @ts-ignore
        return Users.removeSocketId(socketId);
    }

    static async getFriends(userId: string) {
        if (userId === 'backend-service') return [];
        // @ts-ignore
        return Users.getFriends(userId);
    }
}
