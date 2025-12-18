const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const username = process.argv[2];
    if (!username) {
        console.log('Usage: node makeAdmin.js <username>');
        process.exit(1);
    }

    // Access the UserModel directly from mongoose
    const UserModel = mongoose.connection.db.collection('users');
    const result = await UserModel.updateOne({ username }, { $set: { isAdmin: true } });

    if (result.modifiedCount > 0) {
        console.log(`✅ ${username} is now admin`);
    } else {
        console.log(`⚠️ User ${username} not found or already admin`);
    }

    process.exit(0);
}).catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});