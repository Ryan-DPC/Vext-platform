import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
// @ts-ignore
import streamifier from 'streamifier';
import dotenv from 'dotenv';

dotenv.config();

// cloudinary.config() will automatically read CLOUDINARY_URL from process.env
if (!process.env.CLOUDINARY_URL) {
    console.warn("⚠️ CLOUDINARY_URL is missing in .env. Image uploads may fail.");
}

const uploadFromBuffer = (buffer: Buffer): Promise<UploadApiResponse | undefined> => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: 'ether/avatars',
            },
            (error?: UploadApiErrorResponse, result?: UploadApiResponse) => {
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

export { cloudinary, uploadFromBuffer };
