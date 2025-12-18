const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

/**
 * CONFIGURATION: EDIT THIS SECTION TO ADD A NEW GAME
 */
const NEW_GAME = {
    game_name: "Super New Game",          // Display Name
    folder_name: "super-new-game",        // Unique ID (slug)
    github_url: "https://github.com/Ryan-DPC/MyNewGameRepo", // GitHub URL
    description: "A brand new exciting game.",
    developer: "Ryan-DPC"
};

// Setup Env
try {
    const backendEnv = path.join(__dirname, '../../.env');
    const rootEnv = path.join(__dirname, '../../../.env');
    let dotenvPath = backendEnv;
    if (!fs.existsSync(backendEnv) && fs.existsSync(rootEnv)) {
        dotenvPath = rootEnv;
    }
    require('dotenv').config({ path: dotenvPath });
} catch (e) { }

async function run() {
    try {
        const uri = process.env.MONGO_URI ? process.env.MONGO_URI.replace('ether_mongo', 'localhost') : null;
        if (!uri) throw new Error('MONGO_URI missing');

        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        const GameModel = mongoose.models.Game || mongoose.model('Game', new mongoose.Schema({
            game_name: String,
            folder_name: { type: String, unique: true },
            description: String,
            github_url: String,
            developer: String,
            status: { type: String, default: 'bientôt' },
            created_at: { type: Date, default: Date.now }
        }));

        console.log(`Adding/Updating game: ${NEW_GAME.game_name}...`);

        const result = await GameModel.findOneAndUpdate(
            { folder_name: NEW_GAME.folder_name },
            { $set: NEW_GAME },
            { upsert: true, new: true }
        );

        console.log('✅ Game saved successfully:', result.folder_name);
        console.log('👉 Now run: node src/scripts/sync_games.js');

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await mongoose.disconnect();
    }
}

run();
