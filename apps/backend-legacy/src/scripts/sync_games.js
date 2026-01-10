const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

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

// Redis Cache Helper
const { createClient } = require('redis');
async function clearCache() {
    if (!process.env.REDIS_URL) return;
    try {
        const redisUrl = process.env.REDIS_URL.replace('ether_redis', 'localhost');
        const client = createClient({ url: redisUrl });
        client.on('error', () => { }); // ignore
        await client.connect();
        const keys = await client.keys('cloudinary:manifests:*');
        if (keys.length > 0) await client.del(keys);
        await client.disconnect();
        console.log('✅ Cache cleared.');
    } catch (e) {
        console.warn('Cache clear warning:', e.message);
    }
}

async function run() {
    try {
        const uri = process.env.MONGO_URI ? process.env.MONGO_URI.replace('ether_mongo', 'localhost') : null;
        if (!uri) throw new Error('MONGO_URI missing');

        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        const GamesService = require('../features/games/games.service');

        // We could fetch all games from DB and sync them
        const GameModel = mongoose.models.Game || mongoose.model('Game');

        // 0. Self-heal: Ensure EtherChess has GitHub URL if missing
        const etherChess = await GameModel.findOne({ folder_name: 'ether-chess' });
        if (etherChess && !etherChess.github_url) {
            console.log('Orphaned EtherChess found. Attaching GitHub URL...');
            etherChess.github_url = 'https://github.com/Ryan-DPC/EtherChess';
            await etherChess.save();
        }

        const games = await GameModel.find({ github_url: { $ne: null } });

        console.log(`Found ${games.length} games in DB with GitHub URL.`);

        for (const game of games) {
            console.log(`Processing ${game.game_name} (${game.folder_name})...`);
            try {
                await GamesService.syncFromGitHub(game.folder_name);
                console.log(`✅ ${game.game_name} synced successfully.`);
            } catch (err) {
                console.error(`❌ Failed to sync ${game.game_name}:`, err.message);
            }
        }

        await clearCache();

    } catch (error) {
        console.error('CRITICAL ERROR:', error);
    } finally {
        await mongoose.disconnect();
    }
}

run();
