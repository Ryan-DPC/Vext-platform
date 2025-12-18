const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const GameModel = require('../features/games/games.model');

try {
    const backendEnv = path.join(__dirname, '../../.env');
    const rootEnv = path.join(__dirname, '../../../.env');

    let dotenvPath = backendEnv;
    if (!fs.existsSync(backendEnv)) {
        if (fs.existsSync(rootEnv)) {
            dotenvPath = rootEnv;
        }
    }

    require('dotenv').config({ path: dotenvPath });
} catch (e) {
    console.error('Setup failed:', e.message);
    process.exit(1);
}

async function listGames() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const Game = mongoose.models.Game || mongoose.model('Game');

        const games = await Game.find({});
        console.log(`Found ${games.length} games:`);
        games.forEach(g => {
            console.log(`- [${g._id}] ${g.game_name} (${g.folder_name})`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

listGames();
