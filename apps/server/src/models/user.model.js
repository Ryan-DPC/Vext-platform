const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
    {
        username: { type: String, required: true, unique: true, index: true },
        password: { type: String, required: false },
        email: { type: String, required: true, unique: true, index: true },
        github_id: { type: String, default: null, index: true },
        github_username: { type: String, default: null },
        isAdmin: { type: Boolean, default: false },
        tokens: { type: Number, default: 1000 },
        currency: { type: String, enum: ['CHF', 'EUR', 'USD', 'GBP'], default: 'CHF' },
        balances: {
            chf: { type: Number, default: 0 },
            eur: { type: Number, default: 0 },
            usd: { type: Number, default: 0 },
            gbp: { type: Number, default: 0 },
        },
        profile_pic: { type: String, default: null },
        elo: { type: Number, default: 1600 },
        socket_id: { type: String, default: null, index: true },
        // New fields for Cyber Sakura profile
        xp: { type: Number, default: 0 },
        level: { type: Number, default: 1 },
        status_message: { type: String, default: 'Online' },
        favorite_games: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Game' }],
        friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        resetPasswordToken: { type: String, default: null },
        resetPasswordExpires: { type: Date, default: null }
    },
    { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

const UserModel = mongoose.models.User || mongoose.model('User', userSchema);

class Users {
    static async createUser({ username, password, email, tokens = 1000, profile_pic = null, elo = 1600, currency = 'CHF', balances = {}, github_id = null, github_username = null }) {
        const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
        const defaultBalances = { chf: 0, eur: 0, usd: 0, gbp: 0, ...balances };
        const userData = { username, email, tokens, profile_pic, elo, currency, balances: defaultBalances, github_id, github_username };
        if (hashedPassword) {
            userData.password = hashedPassword;
        }
        const doc = await UserModel.create(userData);
        return { id: doc._id.toString(), username: doc.username, email: doc.email, tokens: doc.tokens, profile_pic: doc.profile_pic, elo: doc.elo, currency: doc.currency, balances: doc.balances };
    }

    static async getUserByUsername(username) {
        const doc = await UserModel.findOne({ username }).lean();
        if (!doc) return null;
        return { ...doc, id: doc._id.toString() };
    }

    static async getUserByBaseUsername(baseUsername) {
        // Case insensitive search for username starting with baseUsername followed by #
        // Escape special regex characters in baseUsername just in case
        const escapedUsername = baseUsername.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`^${escapedUsername}#[a-zA-Z0-9]{4}$`, 'i');
        const doc = await UserModel.findOne({ username: regex }).lean();
        if (!doc) return null;
        return { ...doc, id: doc._id.toString() };
    }

    static async getUserByEmail(email) {
        const doc = await UserModel.findOne({ email }).lean();
        if (!doc) return null;
        return { ...doc, id: doc._id.toString() };
    }

    static async getUserByGithubId(githubId) {
        const doc = await UserModel.findOne({ github_id: githubId }).lean();
        if (!doc) return null;
        return { ...doc, id: doc._id.toString() };
    }

    static async updateUser(userId, updateData) {
        const res = await UserModel.updateOne({ _id: userId }, { $set: updateData });
        return res.modifiedCount > 0;
    }

    static async findUsersByUsername(username, excludeUserId) {
        const filter = { username: { $regex: username, $options: 'i' } };
        if (excludeUserId) filter._id = { $ne: new mongoose.Types.ObjectId(excludeUserId) };
        const docs = await UserModel.find(filter, { username: 1, profile_pic: 1, profile_picture: 1, elo: 1 }).lean();
        return docs.map((d) => {
            const profilePic = d.profile_pic || d.profile_picture;
            return {
                id: d._id.toString(),
                username: d.username,
                profile_pic: profilePic || '/assets/images/default-game.png',
                profile_picture: profilePic || '/assets/images/default-game.png',
                elo: d.elo
            };
        });
    }

    static async getUserById(userId) {
        const doc = await UserModel.findById(userId, {
            username: 1, tokens: 1, elo: 1, profile_pic: 1, profile_picture: 1,
            currency: 1, balances: 1, isAdmin: 1, created_at: 1,
            xp: 1, level: 1, status_message: 1, favorite_games: 1
        }).populate('favorite_games', 'name image_url').lean();
        if (!doc) return null;
        const user = { id: doc._id.toString(), ...doc };
        if (!user.profile_picture && user.profile_pic) {
            user.profile_picture = user.profile_pic;
        }
        return user;
    }

    static async updateUserTokens(id, tokens) {
        const res = await UserModel.updateOne({ _id: id }, { $set: { tokens } });
        return res.modifiedCount;
    }

    static async updateUserBalance(userId, currency, amount) {
        const updateField = `balances.${currency.toLowerCase()}`;
        const res = await UserModel.updateOne({ _id: userId }, { $set: { [updateField]: amount } });
        return res.modifiedCount;
    }

    static async decrementBalance(userId, currency, amount) {
        const updateField = `balances.${currency.toLowerCase()}`;
        const res = await UserModel.updateOne({ _id: userId }, { $inc: { [updateField]: -amount } });
        return res.modifiedCount;
    }

    static async incrementBalance(userId, currency, amount) {
        const updateField = `balances.${currency.toLowerCase()}`;
        const res = await UserModel.updateOne({ _id: userId }, { $inc: { [updateField]: amount } });
        return res.modifiedCount;
    }

    static async updateUserProfilePic(id, profile_pic) {
        const res = await UserModel.updateOne({ _id: id }, { $set: { profile_pic } });
        return res.modifiedCount;
    }

    static async getUserElo(id) {
        const doc = await UserModel.findById(id, { elo: 1 }).lean();
        return doc ? doc.elo : null;
    }

    static async updateUserElo(userId, newElo) {
        const res = await UserModel.updateOne({ _id: userId }, { $set: { elo: newElo } });
        return res.modifiedCount;
    }

    static async incrementUserElo(id, increment) {
        const res = await UserModel.updateOne({ _id: id }, { $inc: { elo: increment } });
        return res.modifiedCount;
    }

    static async decrementUserElo(id, decrement) {
        const res = await UserModel.updateOne({ _id: id }, { $inc: { elo: -Number(decrement) } });
        return res.modifiedCount;
    }

    static async saveSocketId(userId, socketId) {
        // Skip if userId is not a valid ObjectId (e.g., 'backend-service')
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            console.warn(`⚠️ Skipping saveSocketId: Invalid ObjectId format: ${userId}`);
            return 0;
        }
        const res = await UserModel.updateOne({ _id: userId }, { $set: { socket_id: socketId } });
        return res.modifiedCount;
    }

    static async getUserBySocketId(socketId) {
        const doc = await UserModel.findOne({ socket_id: socketId }, { username: 1 }).lean();
        return doc ? { username: doc.username } : null;
    }

    static async removeSocketId(socketId) {
        await UserModel.updateOne({ socket_id: socketId }, { $unset: { socket_id: 1 } });
    }

    static async getUserByResetToken(token) {
        const doc = await UserModel.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        }).lean();
        if (!doc) return null;
        return { ...doc, id: doc._id.toString() };
    }

    static async getFriends(userId) {
        // Skip if userId is not a valid ObjectId (e.g., 'backend-service')
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            console.warn(`⚠️ Skipping getFriends: Invalid ObjectId format: ${userId}`);
            return [];
        }
        const doc = await UserModel.findById(userId, { friends: 1 }).populate('friends', 'username socket_id').lean();
        if (!doc || !doc.friends) return [];
        return doc.friends.map(f => ({
            id: f._id.toString(),
            username: f.username,
            socketId: f.socket_id
        }));
    }
}

module.exports = Users;
