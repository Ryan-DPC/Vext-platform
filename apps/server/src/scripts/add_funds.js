const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/db');

// Import the user schema to get UserModel
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

const User = mongoose.models.User || mongoose.model('User', userSchema);

const addFunds = async () => {
    try {
        await connectDB();


        console.log('Connected to DB');

        const amount = 100;
        const users = await User.find({});

        console.log(`Found ${users.length} users to update.`);

        for (const user of users) {
            if (!user.balances) {
                user.balances = { chf: 0 };
            }
            if (user.balances.chf === undefined) {
                user.balances.chf = 0;
            }

            user.balances.chf += amount;
            await user.save();
            console.log(`Added ${amount} CHF to ${user.username}. New balance: ${user.balances.chf}`);
        }

        process.exit(0);
    } catch (error) {
        console.error('Error adding funds:', error);
        process.exit(1);
    }
};

addFunds();
