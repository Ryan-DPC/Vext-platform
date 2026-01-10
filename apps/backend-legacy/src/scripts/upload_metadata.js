const path = require('path');
const fs = require('fs');

let CloudinaryService;

console.log('Script Starting...');

try {
    // Try backend/.env first, then root .env
    const backendEnv = path.join(__dirname, '../../.env');
    const rootEnv = path.join(__dirname, '../../../.env');

    let dotenvPath = backendEnv;
    if (!fs.existsSync(backendEnv)) {
        console.log(`backend/.env not found, checking root .env`);
        if (fs.existsSync(rootEnv)) {
            console.log(`Found root .env at ${rootEnv}`);
            dotenvPath = rootEnv;
        } else {
            console.warn('WARNING: No .env file found');
        }
    }

    console.log('Loading .env from:', dotenvPath);
    require('dotenv').config({ path: dotenvPath });

    const servicePath = path.join(__dirname, '../services/cloudinary.service');
    console.log('Loading service from:', servicePath);
    CloudinaryService = require(servicePath);
    console.log('Service loaded.');
} catch (e) {
    console.error('Setup failed:', e.message);
    process.exit(1);
}

async function run() {
    const gameId = 'ether-chess';

    const metadata = {
        name: "EtherChess",
        description: "A decentralized chess game on the Ether platform. Play against others and earn tokens.",
        developer: "Ether Team",
        tags: ["Strategy", "Multiplayer", "Blockchain"],
        entryPoint: "EtherChess.exe",
        github_url: "https://github.com/Ryan-DPC/EtherChess",
        image_url: "https://res.cloudinary.com/dp2ehihtw/image/upload/games/ether-chess/cover.jpg"
    };

    console.log(`Preparing metadata for ${gameId}...`);
    console.log(JSON.stringify(metadata, null, 2));

    try {
        const service = new CloudinaryService();
        if (!service.isEnabled()) {
            console.error('Cloudinary not enabled');
            process.exit(1);
        }

        // Convert JSON to Buffer
        const buffer = Buffer.from(JSON.stringify(metadata, null, 2));
        const publicId = `games/${gameId}/metadata.json`;

        console.log(`Uploading to ${publicId} ...`);

        // uploadBuffer(buffer, publicId, options)
        const result = await service.uploadBuffer(buffer, publicId, {
            resource_type: 'raw', // JSON is a raw file
            public_id: publicId,
            format: 'json'
        });

        console.log('SUCCESS');
        console.log('URL:', result.url);
    } catch (e) {
        console.error('Upload failed:', e.message);
        process.exit(1);
    }
}

run();
