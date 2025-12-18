const mongoose = require('mongoose');

// Use Cloud Atlas URI directly
const MONGO_URI = "mongodb+srv://Ether-db:3X8GtnL5faywIQyj@ethercluster.metewz3.mongodb.net/ether_finance?appName=EtherCluster";

const userSchema = new mongoose.Schema({
    username: String,
    isAdmin: Boolean
});

const User = mongoose.model('User', userSchema);

async function promoteToAdmin() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('Connected.');

        // Search for partial match or exact match depending on input
        // User provided: "ChinOLaoy #EFI" -> database has "ChinOLaoy#EFI"
        const targetUsername = "ChinOLaoy#EFI";

        const user = await User.findOne({ username: targetUsername });

        if (!user) {
            console.error(`User '${targetUsername}' not found!`);
            // List all users to help debug if needed, or just partial match
            const allUsers = await User.find({}, 'username');
            console.log('Available users:', allUsers.map(u => u.username));
        } else {
            user.isAdmin = true;
            await user.save();
            console.log(`✅ User '${targetUsername}' is now an Admin!`);
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected.');
    }
}

promoteToAdmin();
