const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' }); // Load root .env

async function updateGame() {
    try {
        const mongoUri = process.env.MONGO_URI;
        if (!mongoUri) {
            throw new Error('MONGO_URI not found in .env');
        }

        console.log('Connecting to MongoDB...');
        await mongoose.connect(mongoUri);
        console.log('Connected.');

        // Simple Schema Definition if we don't import model
        const GameSchema = new mongoose.Schema({}, { strict: false });
        const Game = mongoose.model('Game', GameSchema, 'games');

        const folderName = 'stick-fighter'; // Confirmed from list_games.js
        const githubUrl = 'https://github.com/Ryan-DPC/Stick-Fighter';

        console.log(`Updating ${folderName} with GitHub URL: ${githubUrl}`);

        const result = await Game.updateOne(
            { folder_name: folderName },
            { $set: { github_url: githubUrl } }
        );

        if (result.matchedCount === 0) {
            console.error('❌ Game not found!');
        } else {
            console.log('✅ Game Updated Successfully!');
            console.log(result);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

updateGame();
