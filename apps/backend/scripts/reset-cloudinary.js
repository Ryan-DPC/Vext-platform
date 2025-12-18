require('dotenv').config({ path: '../.env' });
const cloudinary = require('cloudinary').v2;

const resetCloudinary = async () => {
    try {
        if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
            throw new Error('Cloudinary credentials are missing in .env');
        }

        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET
        });

        console.log('Connected to Cloudinary.');

        // 1. Delete all resources (images, raw files, video, etc.)
        console.log('Deleting all resources...');
        await cloudinary.api.delete_all_resources();
        console.log('All resources deleted.');

        // 2. Delete all folders (optional, but good for a full reset)
        // Note: Folders must be empty to be deleted. delete_all_resources should handle content.
        // Getting root folders
        const rootFolders = await cloudinary.api.root_folders();

        for (const folder of rootFolders.folders) {
            console.log(`Deleting folder: ${folder.name}`);
            try {
                // We might need to delete subfolders recursively in a real scenario, 
                // but delete_resources_by_prefix might be needed if delete_all_resources didn't catch everything.
                // For now, we attempt to delete the folder.
                await cloudinary.api.delete_folder(folder.path);
            } catch (e) {
                console.warn(`Could not delete folder ${folder.name}:`, e.message);
            }
        }

        console.log('Cloudinary reset complete.');
        process.exit(0);
    } catch (error) {
        console.error('Error resetting Cloudinary:', error);
        process.exit(1);
    }
};

resetCloudinary();
