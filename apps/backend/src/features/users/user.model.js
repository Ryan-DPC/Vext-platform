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
        language: { type: String, default: 'English' },
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
        wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Game' }],
        resetPasswordToken: { type: String, default: null },
        resetPasswordExpires: { type: Date, default: null },
        bio: { type: String, default: '' },
        social_links: {
            twitter: { type: String, default: '' },
            discord: { type: String, default: '' },
            website: { type: String, default: '' }
        },
        notification_preferences: {
            email_updates: { type: Boolean, default: true },
            push_notifications: { type: Boolean, default: true },
            marketing_emails: { type: Boolean, default: false }
        }
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
        const regex = new RegExp(`^${escapedUsername}#[a-zA-Z0-9]{3,4}$`, 'i');
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
            let finalPic = profilePic;
            if (finalPic && (finalPic.includes('/assets/') || finalPic.includes('placeholder'))) {
                finalPic = null;
            }
            return {
                id: d._id.toString(),
                username: d.username,
                profile_pic: finalPic,
                profile_picture: finalPic,
                elo: d.elo
            };
        });
    }

    static async getUserById(userId) {
        const doc = await UserModel.findById(userId, {
            username: 1, tokens: 1, elo: 1, profile_pic: 1, profile_picture: 1,
            currency: 1, balances: 1, isAdmin: 1, created_at: 1,
            xp: 1, level: 1, status_message: 1, favorite_games: 1,
            bio: 1, social_links: 1, notification_preferences: 1
        }).populate('favorite_games', 'name image_url').lean();
        if (!doc) return null;
        const user = { id: doc._id.toString(), ...doc };
        if (!user.profile_picture && user.profile_pic) {
            user.profile_picture = user.profile_pic;
        }
        return user;
    }

    static async updateUserTokens(id, tokens, session = null) {
        const options = session ? { session } : {};
        const res = await UserModel.updateOne({ _id: id }, { $set: { tokens } }, options);
        return res.modifiedCount;
    }

    static async updateUserBalance(userId, currency, amount, session = null) {
        const updateField = `balances.${currency.toLowerCase()}`;
        const options = session ? { session } : {};
        const res = await UserModel.updateOne({ _id: userId }, { $set: { [updateField]: amount } }, options);
        return res.modifiedCount;
    }

    static async decrementBalance(userId, currency, amount, session = null) {
        const updateField = `balances.${currency.toLowerCase()}`;
        const options = session ? { session } : {};
        const res = await UserModel.updateOne({ _id: userId }, { $inc: { [updateField]: -amount } }, options);
        return res.modifiedCount;
    }

    static async decrementBalanceIfSufficient(userId, currency, amount, session = null) {
        const balanceField = `balances.${currency.toLowerCase()}`;
        const filter = {
            _id: userId,
            [balanceField]: { $gte: amount }
        };
        const update = { $inc: { [balanceField]: -amount } };
        const options = session ? { session } : {};

        const res = await UserModel.updateOne(filter, update, options);
        return res.modifiedCount > 0;
    }

    static async incrementBalance(userId, currency, amount, session = null) {
        const updateField = `balances.${currency.toLowerCase()}`;
        const options = session ? { session } : {};
        const res = await UserModel.updateOne({ _id: userId }, { $inc: { [updateField]: amount } }, options);
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

    static async addToWishlist(userId, gameId) {
        // Resolve Game ID (in case slug is passed)
        const Games = require('../games/games.model');
        const game = await Games.findGameByIdOrSlug(gameId);
        if (!game) throw new Error('Game not found');

        return await UserModel.updateOne({ _id: userId }, { $addToSet: { wishlist: game._id } });
    }

    static async removeFromWishlist(userId, gameId) {
        // Resolve Game ID
        const Games = require('../games/games.model');
        const game = await Games.findGameByIdOrSlug(gameId);
        // If game not found, try removing raw ID anyway just in case
        const idToRemove = game ? game._id : gameId;

        return await UserModel.updateOne({ _id: userId }, { $pull: { wishlist: idToRemove } });
    }

    static async getWishlist(userId) {
        const doc = await UserModel.findById(userId).populate('wishlist').lean();
        return doc ? doc.wishlist : [];
    }
}

module.exports = Users;
