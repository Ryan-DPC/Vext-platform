const mongoose = require('mongoose');
const crypto = require('crypto');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
    console.log('📦 Connected to MongoDB');

    const GameOwnership = mongoose.connection.db.collection('gameownerships');

    // Find all documents without ownership_token (null or missing)
    const docsWithoutToken = await GameOwnership.find({
        $or: [
            { ownership_token: { $exists: false } },
            { ownership_token: null }
        ]
    }).toArray();

    console.log(`Found ${docsWithoutToken.length} documents without ownership_token`);

    if (docsWithoutToken.length === 0) {
        console.log('✅ All documents already have ownership_token');
        process.exit(0);
    }

    // Update each document with a unique token
    for (const doc of docsWithoutToken) {
        const token = crypto.randomBytes(16).toString('hex');
        await GameOwnership.updateOne(
            { _id: doc._id },
            { $set: { ownership_token: token } }
        );
    }

    console.log(`✅ Updated ${docsWithoutToken.length} documents with ownership_token`);
    process.exit(0);
}).catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});
