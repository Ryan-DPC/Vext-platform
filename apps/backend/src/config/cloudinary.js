const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');
require('dotenv').config();

// cloudinary.config() will automatically read CLOUDINARY_URL from process.env
// No explicit config needed if the env var follows the standard format.
if (!process.env.CLOUDINARY_URL) {
    console.warn("⚠️ CLOUDINARY_URL is missing in .env. Image uploads may fail.");
}

const uploadFromBuffer = (buffer) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: 'ether/avatars',
            },
            (error, result) => {
                if (result) {
                    resolve(result);
                } else {
                    reject(error);
                }
            }
        );
        streamifier.createReadStream(buffer).pipe(stream);
    });
};

module.exports = { cloudinary, uploadFromBuffer };
