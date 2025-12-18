const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;

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

cloudinary.config({
    cloudinary_url: process.env.CLOUDINARY_URL
});

async function run() {
    try {
        console.log('Listing raw files in games/ ...');
        const result = await cloudinary.api.resources({
            type: 'upload',
            resource_type: 'raw',
            prefix: 'games/',
            max_results: 100
        });

        console.log('Files found:');
        result.resources.forEach(r => {
            console.log(`- ${r.public_id} (${r.bytes} bytes)`);
        });

    } catch (e) {
        console.error('Cloudinary API Error:', e.message);
    }
}

run();
