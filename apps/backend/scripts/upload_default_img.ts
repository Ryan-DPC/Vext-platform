import { v2 as cloudinary } from 'cloudinary';
import path from 'path';
import fs from 'fs';

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

console.log('Using credentials:', {
  cloud_name: configData.cloud_name,
  api_key: configData.api_key,
  api_secret_len: configData.api_secret?.length || 0,
});

const uploadFile = async (fileName: string, publicId: string) => {
  const filePath = path.resolve(__dirname, `../../frontend/src/assets/images/${fileName}`);
  console.log(`Uploading ${fileName}...`);

  try {
    const result = await cloudinary.uploader.upload(filePath, {
      ...configData, // Passing variables directly
      folder: 'assets',
      public_id: publicId,
      overwrite: true,
      resource_type: 'image',
      invalidate: true,
    });
    console.log(`SUCCESS: ${result.secure_url}`);
  } catch (error: any) {
    console.error(`FAILED: ${error.message}`);
    // If it fails, let's try one more time by explicitly setting the global config right before
    console.log('Retrying with global config...');
    cloudinary.config(configData);
    try {
      const result2 = await cloudinary.uploader.upload(filePath, {
        folder: 'assets',
        public_id: publicId,
        overwrite: true,
        resource_type: 'image',
        invalidate: true,
      });
      console.log(`SUCCESS on retry: ${result2.secure_url}`);
    } catch (err2: any) {
      console.error(`FAILED on retry: ${err2.message}`);
      throw err2;
    }
  }
};

const run = async () => {
  try {
    // Try ONLY white one first to see if it's the file or the order
    await uploadFile('vext-game-white.svg', 'vext-game-white');
    console.log('---');
    await uploadFile('vext-game-black.svg', 'vext-game-black');
  } catch (e) {
    process.exit(1);
  }
};

run();
