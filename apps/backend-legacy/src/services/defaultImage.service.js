const CloudinaryService = require('./cloudinary.service');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../utils/logger');

class DefaultImageService {
    static async ensureDefaultImage() {
        if (DefaultImageService.checked) return;

        const cloudinary = new CloudinaryService();
        if (!cloudinary.isEnabled()) return;
        const defaultPublicId = 'games/default-game';
        try {
            // Check if image already exists
            const result = await cloudinary.api.resources({
                type: 'upload',
                prefix: 'games/',
                max_results: 500
            });
            const exists = result.resources.some(r => r.public_id === defaultPublicId);
            if (exists) {
                logger.debug('[DefaultImage] ✅ Default image already exists on Cloudinary');
                DefaultImageService.checked = true;
                return;
            }
        } catch (e) {
            logger.debug('[DefaultImage] ⚠️ Could not list resources, proceeding to upload');
        }
        // Upload local default image
        // Path is relative to backend/src/services/
        // File is now in backend root (backend/default-game.png) to be accessible in Docker
        const localPath = path.resolve(__dirname, '../../public/default-game.svg');
        try {
            const data = await fs.readFile(localPath);
            await cloudinary.uploadBuffer(data, 'default-game', {
                folder: 'games',
                resource_type: 'image',
                transformation: [{ width: 300, height: 300, crop: 'fill', gravity: 'auto' }]
            });
            logger.info('[DefaultImage] ✅ Uploaded default-game.png to Cloudinary');
            DefaultImageService.checked = true;
        } catch (err) {
            logger.error(`[DefaultImage] ❌ Failed to upload default image: ${err.message}`);
        }
    }
}
DefaultImageService.checked = false;

module.exports = DefaultImageService;
