import { v2 as cloudinary } from 'cloudinary';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// ESM compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Manual env parsing
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach((line) => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const value = parts.slice(1).join('=').trim();
      if (key && value) {
        process.env[key] = value;
      }
    }
  });
}

const configData = {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
};

const uploadFile = async (fileName: string, publicId: string) => {
  const filePath = path.resolve(__dirname, `../../frontend/src/assets/images/${fileName}`);
  console.log(`Uploading ${filePath} as ${publicId}...`);

  try {
    const result = await cloudinary.uploader.upload(filePath, {
      ...configData,
      folder: 'assets/hero',
      public_id: publicId,
      overwrite: true,
      resource_type: 'image',
      invalidate: true,
    });
    console.log(`SUCCESS: ${result.secure_url}`);
  } catch (error: any) {
    console.error(`FAILED: ${error.message}`);
    process.exit(1);
  }
};

// This script now only uploads ONE file based on argument or default
const fileToUpload = process.argv[2] || 'vext-game-black.svg';
const publicId = fileToUpload.split('.')[0];

uploadFile(fileToUpload, publicId);
