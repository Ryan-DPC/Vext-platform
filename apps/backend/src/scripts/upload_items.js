const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const cloudinary = require('cloudinary').v2;

const items = [
    { file: 'banner.png', folder: 'items/banners', name: 'cyber_city_banner' },
    { file: 'title_banner.png', folder: 'items/banners', name: 'tech_hud_banner' },
    { file: 'avatar_frame.png', folder: 'items/avatar_frames', name: 'neon_cyan_frame' },
    { file: 'background.png', folder: 'items/backgrounds', name: 'cyber_hex_bg' }
];

const imagesDir = path.join(__dirname, '../../../images');

async function uploadImages() {
    if (!process.env.CLOUDINARY_URL) {
        console.error('❌ CLOUDINARY_URL not found in .env');
        process.exit(1);
    } else {
        console.log('CLOUDINARY_URL is set (length: ' + process.env.CLOUDINARY_URL.length + ')');
    }

    console.log('🚀 Starting upload to Cloudinary...');

    for (const item of items) {
        const filePath = path.join(imagesDir, item.file);
        try {
            console.log(`Uploading ${item.file} from ${filePath}...`);
            const result = await cloudinary.uploader.upload(filePath, {
                folder: item.folder,
                public_id: item.name,
                overwrite: true,
                resource_type: 'image'
            });
            console.log(`✅ Uploaded ${item.name}: ${result.secure_url}`);
        } catch (error) {
            console.error(`❌ Failed to upload ${item.file}:`, error);
        }
    }
    console.log('✨ All done!');
}

uploadImages();
