const path = require('path');
const fs = require('fs');

let CloudinaryService;

console.log('Script Starting...');

try {
    // Try backend/.env first, then root .env
    // src/scripts -> backend/src -> backend -> root
    const backendEnv = path.join(__dirname, '../../.env');
    const rootEnv = path.join(__dirname, '../../../.env');

    let dotenvPath = backendEnv;
    if (!fs.existsSync(backendEnv)) {
        console.log(`backend/.env not found at ${backendEnv}`);
        if (fs.existsSync(rootEnv)) {
            console.log(`Found root .env at ${rootEnv}`);
            dotenvPath = rootEnv;
        } else {
            console.warn('WARNING: No .env file found in backend or root');
        }
    }

    console.log('Loading .env from:', dotenvPath);
    require('dotenv').config({ path: dotenvPath });

    // Debug env vars presence
    const cloudKeys = Object.keys(process.env).filter(k => k.includes('CLOUD'));
    console.log('Cloudinary Keys found:', cloudKeys);
    if (cloudKeys.length === 0) {
        console.error('❌ CRITICAL: No Cloudinary keys found in .env!');
    }

    const servicePath = path.join(__dirname, '../services/cloudinary.service');
    console.log('Loading service from:', servicePath);
    CloudinaryService = require(servicePath);
    console.log('Service loaded.');
} catch (e) {
    console.error('Setup failed:', e.message);
    process.exit(1);
}

async function run() {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.error('Usage: node script.js <gameId> <imagePath>');
        process.exit(1);
    }
    const gameId = args[0];
    const imagePath = args[1];

    if (!fs.existsSync(imagePath)) {
        console.error('File not found:', imagePath);
        process.exit(1);
    }

    try {
        const service = new CloudinaryService();
        if (!service.isEnabled()) {
            console.error('Cloudinary not enabled (isEnabled returned false)');
            process.exit(1);
        }
        console.log(`Uploading ${imagePath} to games/${gameId}/cover ...`);

        // Fix: Don't use folder AND full public_id path to avoid nesting
        // Force format to jpg as per user preference
        const result = await service.uploadFile(imagePath, `games/${gameId}/cover`, {
            resource_type: 'image',
            format: 'jpg'
        });
        console.log('SUCCESS');
        console.log('URL:', result.url);
    } catch (e) {
        console.error('Upload failed:', e.message);
        process.exit(1);
    }
}

run();
