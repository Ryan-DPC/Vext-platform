const CloudinaryService = require('../services/cloudinary.service');
const path = require('path');
const fs = require('fs');

// Setup Env
try {
    const rootEnv = path.join(__dirname, '../../../.env');
    require('dotenv').config({ path: rootEnv });
} catch (e) { }

async function run() {
    try {
        const cloudinaryService = new CloudinaryService();
        console.log('Cloudinary Enabled:', cloudinaryService.isEnabled());

        const games = await cloudinaryService.getAllGames(true); // Force clear cache
        const etherChess = games.find(g => g.folder_name === 'ether-chess' || g.folder_name === 'EtherChess');

        if (etherChess) {
            console.log('--- EtherChess Object ---');
            console.log('ID:', etherChess.id);
            console.log('Version:', etherChess.version);
            console.log('Is Multiplayer:', etherChess.is_multiplayer);
            console.log('Genre:', etherChess.genre);
            console.log('Full Object:', JSON.stringify(etherChess, null, 2));
        } else {
            console.log('❌ EtherChess not found in Cloudinary list.');
            games.forEach(g => console.log(`- ${g.folder_name}`));
        }

    } catch (e) {
        console.error('Error:', e);
    }
}

run();
