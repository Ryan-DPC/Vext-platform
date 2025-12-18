const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;

console.log('--- Delete Script ---');

try {
    const backendEnv = path.join(__dirname, '../../.env');
    const rootEnv = path.join(__dirname, '../../../.env');
    let dotenvPath = backendEnv;
    if (!fs.existsSync(backendEnv) && fs.existsSync(rootEnv)) {
        dotenvPath = rootEnv;
    }
    console.log('Loading .env from', dotenvPath);
    require('dotenv').config({ path: dotenvPath });
} catch (e) {
    console.error('Env error', e);
}

const url = process.env.CLOUDINARY_URL;
if (!url) {
    console.error('CLOUDINARY_URL is missing!');
    process.exit(1);
}

// Parse cloudinary://key:secret@cloud_name
const regex = /^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/;
const match = url.match(regex);
if (!match) {
    console.error('Invalid CLOUDINARY_URL format');
    process.exit(1);
}

const [_, apiKey, apiSecret, cloudName] = match;

cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret
});

async function run() {
    try {
        const badPath = 'games/ether-chess/games/ether-chess/metadata.json';
        console.log(`Deleting ${badPath}...`);

        // Note: For raw files, we must specify resource_type: 'raw'
        // destroy(public_id, options)
        const result = await cloudinary.uploader.destroy(badPath, { resource_type: 'raw', invalidate: true });
        console.log('Delete result:', result);

    } catch (e) {
        console.error('Delete error:', e);
    }
}

run();
