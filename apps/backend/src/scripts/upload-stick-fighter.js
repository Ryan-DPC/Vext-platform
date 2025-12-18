const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
const CloudinaryService = require('../services/cloudinary.service');
const fs = require('fs');

async function main() {
    const service = new CloudinaryService();
    if (!service.isEnabled()) {
        console.error('Cloudinary not configured! Check .env file.');
        process.exit(1);
    }

    const gameId = 'stick-fighter';
    const gamesDir = path.join(__dirname, '../../../games/Stick-Fighter');
    const coverPath = path.join(gamesDir, 'cover.png');
    const manifestPath = path.join(gamesDir, 'manifest.json');

    console.log(`Looking for files in: ${gamesDir}`);

    if (!fs.existsSync(coverPath)) {
        console.error(`Cover not found at ${coverPath}`);
        process.exit(1);
    }

    // 1. Upload Cover
    console.log('Uploading cover...');
    const coverResult = await service.uploadFile(coverPath, `games/${gameId}/cover`, {
        resource_type: 'image'
    });
    console.log('Cover uploaded:', coverResult.url);

    // 2. Read and Prepare Manifest
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    // Adapt manifest to metadata schema expected by CloudinaryService.listGamesMetadata
    const metadata = {
        ...manifest,
        name: manifest.gameName, // Service looks for 'name'
        image_url: coverResult.url,
        // Ensure downloadUrl is set
    };

    // 3. Upload Metadata (as raw file)
    console.log('Uploading metadata...');
    const metadataBuffer = Buffer.from(JSON.stringify(metadata, null, 2));

    // uploadBuffer method in service: uploadBuffer(buffer, publicId, options)
    const metaResult = await service.uploadBuffer(metadataBuffer, `games/${gameId}/metadata.json`, {
        resource_type: 'raw'
    });
    console.log('Metadata uploaded:', metaResult.url);
    console.log('Stick Fighter pushed to Cloudinary successfully!');
}

main().catch(err => {
    console.error('Script failed:', err);
    process.exit(1);
});
