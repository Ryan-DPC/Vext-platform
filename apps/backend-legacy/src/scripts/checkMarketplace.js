const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
    console.log('📦 Connected to MongoDB');

    const GameOwnership = mongoose.connection.db.collection('gameownerships');

    // Find ALL items in marketplace (for_sale = true)
    const items = await GameOwnership.find({ for_sale: true }).toArray();

    console.log(`Found ${items.length} items with for_sale=true`);

    items.forEach((item, index) => {
        console.log(`\n--- Item ${index + 1} ---`);
        console.log('  - _id:', item._id);
        console.log('  - game_name:', item.game_name);
        console.log('  - game_key:', item.game_key);
        console.log('  - for_sale:', item.for_sale);
        console.log('  - asking_price:', item.asking_price);
        console.log('  - ownership_token:', item.ownership_token);
    });

    process.exit(0);
}).catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});
