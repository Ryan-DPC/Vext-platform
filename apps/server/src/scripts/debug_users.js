require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const User = require('../models/user.model');
const connectDB = require('../config/db');

const debugUsers = async () => {
    try {
        await connectDB();
        console.log('Connected to DB');

        const users = await User.find({});
        console.log(`Found ${users.length} users:`);
        users.forEach(user => {
            console.log(`- Username: "${user.username}", Email: ${user.email}, ID: ${user._id}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error listing users:', error);
        process.exit(1);
    }
};

debugUsers();
