const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const https = require('https');

// Configuration
const cloudUrl = process.env.CLOUDINARY_URL;
if (!cloudUrl) {
    console.error('❌ CLOUDINARY_URL not found in .env');
    process.exit(1);
}

console.log('🔧 Config loaded. URL starts with:', cloudUrl.substring(0, 25) + '...');

// Parse URL manually to be safe (cloudinary://key:secret@cloud_name)
const matches = cloudUrl.match(/cloudinary:\/\/([^:]+):([^@]+)@(.+)/);
if (matches) {
    cloudinary.config({
        cloud_name: matches[3],
        api_key: matches[1],
        api_secret: matches[2]
    });
} else {
    cloudinary.config({
        url: cloudUrl
    });
}

const TEST_DIR = path.join(__dirname, 'temp_test_data');
const CLOUD_ROOT = 'ether';

// Dummy Data Generators
const createDummyFiles = () => {
    if (!fs.existsSync(TEST_DIR)) fs.mkdirSync(TEST_DIR);

    // EtherChess
    const chessDir = path.join(TEST_DIR, 'EtherChess');
    if (!fs.existsSync(chessDir)) fs.mkdirSync(chessDir);
    fs.writeFileSync(path.join(chessDir, 'manifest.json'), JSON.stringify({
        name: "EtherChess",
        description: "Test Chess Game",
        version: "1.0.0",
        entry: "EtherChess.exe",
        engine: "C#"
    }));
    // Valid 1x1 PNG
    const pngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    fs.writeFileSync(path.join(chessDir, 'logo.png'), pngBuffer);
    fs.writeFileSync(path.join(chessDir, 'game.zip'), 'DUMMY ZIP CONTENT');

    // SpludBuster
    const spludDir = path.join(TEST_DIR, 'SpludBuster');
    if (!fs.existsSync(spludDir)) fs.mkdirSync(spludDir);
    fs.writeFileSync(path.join(spludDir, 'manifest.json'), JSON.stringify({
        name: "SpludBuster",
        version: "1.0.4",
        entry: "SpludBuster.exe"
    }));
    fs.writeFileSync(path.join(spludDir, 'game.zip'), 'DUMMY ZIP CONTENT');

    console.log('✅ Dummy files created locally.');
};

const uploadFile = async (localPath, publicId, resourceType = 'raw') => {
    try {
        const result = await cloudinary.uploader.upload(localPath, {
            public_id: publicId,
            resource_type: resourceType,
            overwrite: true
        });
        console.log(`   ⬆️ Uploaded: ${publicId}`);
        return result;
    } catch (error) {
        console.error(`   ❌ Upload failed for ${publicId}:`, error.message);
        throw error;
    }
};

const setupCloudinary = async () => {
    console.log('🚀 Starting Cloudinary Setup...');

    // Upload EtherChess
    await uploadFile(path.join(TEST_DIR, 'EtherChess/manifest.json'), `${CLOUD_ROOT}/Games/EtherChess/manifest.json`, 'raw');
    await uploadFile(path.join(TEST_DIR, 'EtherChess/logo.png'), `${CLOUD_ROOT}/Games/EtherChess/logo.png`, 'image');
    await uploadFile(path.join(TEST_DIR, 'EtherChess/game.zip'), `${CLOUD_ROOT}/Games/EtherChess/game.zip`, 'raw');

    // Upload SpludBuster
    await uploadFile(path.join(TEST_DIR, 'SpludBuster/manifest.json'), `${CLOUD_ROOT}/Games/SpludBuster/manifest.json`, 'raw');
    await uploadFile(path.join(TEST_DIR, 'SpludBuster/game.zip'), `${CLOUD_ROOT}/Games/SpludBuster/game.zip`, 'raw');

    console.log('✅ Cloudinary Structure Setup Complete.');
};

const fetchUrl = (url) => {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', (err) => reject(err));
    });
};

const verifyCloudinary = async () => {
    console.log('\n🔍 Verifying Cloudinary Content...');
    let errors = 0;

    try {
        // Use Admin API to list resources by prefix
        const rawResources = await cloudinary.api.resources({
            type: 'upload',
            resource_type: 'raw',
            prefix: `${CLOUD_ROOT}/Games/`,
            max_results: 500
        });

        const manifests = rawResources.resources.filter(r => r.public_id.endsWith('manifest.json'));

        console.log(`   Found ${manifests.length} games (manifests).`);

        if (manifests.length === 0) {
            console.error('   ❌ No games found!');
            errors++;
        }

        for (const resource of manifests) {
            // resource.public_id = ether/Games/EtherChess/manifest.json
            const parts = resource.public_id.split('/');
            const gameName = parts[parts.length - 2]; // EtherChess
            console.log(`   🎮 Checking Game: ${gameName}`);

            // Check for game.zip
            const zipPath = `${CLOUD_ROOT}/Games/${gameName}/game.zip`;
            const hasZip = rawResources.resources.some(r => r.public_id === zipPath);

            if (hasZip) {
                console.log(`      ✅ game.zip found`);
            } else {
                console.error(`      ❌ game.zip MISSING for ${gameName}`);
                errors++;
            }

            // Fetch Manifest Content
            const manifestUrl = resource.secure_url;
            try {
                const manifestContent = await fetchUrl(manifestUrl);
                const manifest = JSON.parse(manifestContent);
                if (manifest.name && manifest.version && manifest.entry) {
                    console.log(`      ✅ manifest.json valid (v${manifest.version})`);
                } else {
                    console.error(`      ❌ manifest.json INVALID schema`);
                    errors++;
                }
            } catch (e) {
                console.error(`      ❌ Failed to read manifest: ${e.message}`);
                errors++;
            }
        }

    } catch (error) {
        console.error('   ❌ Verification Error:', error);
        errors++;
    }

    if (errors === 0) {
        console.log('\n✨ ALL TESTS PASSED! System is ready.');
    } else {
        console.log(`\n⚠️ FOUND ${errors} ERRORS. Please fix before deploying.`);
        process.exit(1);
    }
};

const run = async () => {
    try {
        createDummyFiles();
        await setupCloudinary();

        console.log('⏳ Waiting 2s...');
        await new Promise(r => setTimeout(r, 2000));

        await verifyCloudinary();
    } catch (e) {
        console.error('Fatal Error:', e);
    } finally {
        // Cleanup temp files
        // fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
};

run();
