const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const archiver = require('archiver');

// Configuration
const CLOUD_ROOT = 'ether';
const GAME_SLUG = 'ether-chess';
const GAME_NAME = 'Ether Chess';
const GAME_VERSION = '1.0.0';
const DIST_DIR = path.resolve(__dirname, '../../../games/EtherChess/dist');
const OUTPUT_ZIP = path.join(__dirname, 'etherchess.zip');

// Cloudinary Config
const cloudUrl = process.env.CLOUDINARY_URL;
if (!cloudUrl) {
    console.error('❌ CLOUDINARY_URL not found');
    process.exit(1);
}
const matches = cloudUrl.match(/cloudinary:\/\/([^:]+):([^@]+)@(.+)/);
if (matches) {
    cloudinary.config({ cloud_name: matches[3], api_key: matches[1], api_secret: matches[2] });
} else {
    cloudinary.config({ url: cloudUrl });
}

const createManifest = () => {
    const manifest = {
        name: GAME_NAME,
        version: GAME_VERSION,
        description: "A classic chess game for Ether.",
        entry: "EtherChess.exe",
        platform: "exe",
        minWidth: 1280,
        minHeight: 720
    };
    fs.writeFileSync(path.join(DIST_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
    console.log('✅ Created manifest.json in dist');
};

const createZip = () => {
    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(OUTPUT_ZIP);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => {
            console.log(`✅ Created zip: ${archive.pointer()} total bytes`);
            resolve();
        });

        archive.on('error', (err) => reject(err));

        archive.pipe(output);
        archive.directory(DIST_DIR, false); // false = put contents at root
        archive.finalize();
    });
};

const uploadFile = async (localPath, publicId, resourceType = 'raw') => {
    try {
        await cloudinary.uploader.upload(localPath, {
            public_id: publicId,
            resource_type: resourceType,
            overwrite: true
        });
        console.log(`   ⬆️ Uploaded: ${publicId}`);
    } catch (error) {
        console.error(`   ❌ Upload failed for ${publicId}:`, error.message);
        throw error;
    }
};

const deploy = async () => {
    try {
        console.log(`🚀 Deploying ${GAME_NAME}...`);

        if (!fs.existsSync(DIST_DIR)) {
            throw new Error(`Dist directory not found: ${DIST_DIR}`);
        }

        // 1. Create Manifest
        createManifest();

        // 2. Zip Game
        console.log('📦 Zipping game files...');
        await createZip();

        // 3. Upload to Cloudinary
        console.log('☁️ Uploading to Cloudinary...');

        // Upload Manifest
        await uploadFile(path.join(DIST_DIR, 'manifest.json'), `${CLOUD_ROOT}/Games/${GAME_SLUG}/manifest.json`, 'raw');

        // Upload Zip
        await uploadFile(OUTPUT_ZIP, `${CLOUD_ROOT}/Games/${GAME_SLUG}/game.zip`, 'raw');

        // Upload Logo (Dummy for now, or check if exists)
        const logoPath = path.join(DIST_DIR, '../Assets/logo.png'); // Try to find real logo
        if (fs.existsSync(logoPath)) {
            await uploadFile(logoPath, `${CLOUD_ROOT}/Games/${GAME_SLUG}/logo.png`, 'image');
        } else {
            // Create dummy logo
            const dummyLogo = path.join(__dirname, 'temp_logo.png');
            const pngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
            fs.writeFileSync(dummyLogo, pngBuffer);
            await uploadFile(dummyLogo, `${CLOUD_ROOT}/Games/${GAME_SLUG}/logo.png`, 'image');
            fs.unlinkSync(dummyLogo);
        }

        console.log('✨ Deployment Complete!');

    } catch (e) {
        console.error('Fatal Error:', e);
    } finally {
        // Cleanup
        if (fs.existsSync(OUTPUT_ZIP)) fs.unlinkSync(OUTPUT_ZIP);
    }
};

deploy();
