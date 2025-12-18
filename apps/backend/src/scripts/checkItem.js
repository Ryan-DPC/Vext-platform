const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
    console.log('📦 Connected to MongoDB');

    const GameOwnership = mongoose.connection.db.collection('gameownerships');

    // Find the item with this ownership_token
    const token = '37bfeea0680c60e8ab9a203a4783df7d';
    const doc = await GameOwnership.findOne({ ownership_token: token });

    if (!doc) {
        console.log('❌ Document not found with token:', token);
    } else {
        console.log('📄 Document found:');
        console.log('  - _id:', doc._id);
        console.log('  - game_name:', doc.game_name);
        console.log('  - for_sale:', doc.for_sale);
        console.log('  - asking_price:', doc.asking_price);
        console.log('  - listed_at:', doc.listed_at);
        console.log('  - ownership_token:', doc.ownership_token);
    }

    process.exit(0);
}).catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});
