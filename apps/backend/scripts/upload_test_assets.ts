
const { v2: cloudinary } = require('cloudinary');
const path = require('path');

// Configure Cloudinary
if (process.env.CLOUDINARY_CLOUD_NAME) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });
} else {
    console.error("Missing Cloudinary env vars");
    process.exit(1);
}

const ARTIFACTS_DIR = 'C:\\Users\\ryand\\.gemini\\antigravity\\brain\\ea8803d9-8695-4f4b-9d1f-fd837c452231';
const BANNER_FILE = 'test_cyberpunk_banner_1768991944257.png';
const TITLE_FILE = 'test_achievement_title_graphic_1768991853937.png';

const uploadFile = async (filename, folder) => {
    const filePath = path.join(ARTIFACTS_DIR, filename);
    console.log(`Uploading ${filename} to ${folder}...`);
    try {
        const result = await cloudinary.uploader.upload(filePath, {
            folder: folder,
            resource_type: 'image'
        });
        console.log(`✅ Uploaded: ${result.public_id}`);
    } catch (e) {
        console.error(`❌ Failed to upload ${filename}:`, e.message);
    }
};

const run = async () => {
    // Banner succeeded, retry title only if needed, or just upload title.
    // await uploadFile(BANNER_FILE, 'items/banners'); 
    console.log("Retrying Title Upload...");
    await uploadFile(TITLE_FILE, 'items/titles');
};

run();
