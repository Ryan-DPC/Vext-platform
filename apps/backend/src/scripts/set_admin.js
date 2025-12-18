const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Users = require('../features/users/user.model');

const USERNAME_BASE = 'ChinOLaoy';

async function main() {
    console.log('Loading env from:', path.join(__dirname, '../../../../.env'));
    await connectDB();

    console.log(`Checking admin status for '${USERNAME_BASE}'...`);

    // Find user by base username (handles #TAG)
    let user = await Users.getUserByBaseUsername(USERNAME_BASE);

    if (!user) {
        console.log(`User matching pattern '${USERNAME_BASE}#TAG' not found.`);
        console.log('Searching for any user containing "ChinOLaoy"...');
        const users = await mongoose.model('User').find({ username: new RegExp(USERNAME_BASE, 'i') });

        if (users.length === 0) {
            console.error('No matching users found.');
            process.exit(1);
        }

        if (users.length > 1) {
            console.log('Found multiple users:', users.map(u => u.username));
            console.log('Please be more specific or update script.');
            process.exit(1);
        }

        user = { ...users[0].toObject(), id: users[0]._id.toString() };
    }

    console.log(`Found user: ${user.username} (ID: ${user.id})`);
    console.log(`Current isAdmin: ${user.isAdmin}`);

    if (user.isAdmin) {
        console.log('✅ User is already an admin.');
    } else {
        console.log('Setting isAdmin to true...');
        const success = await Users.updateUser(user.id, { isAdmin: true });
        if (success) {
            console.log('✅ Successfully updated user to Admin.');
        } else {
            console.error('❌ Failed to update user in DB.');
        }
    }

    process.exit(0);
}

main().catch(err => {
    console.error('Script error:', err);
    process.exit(1);
});
