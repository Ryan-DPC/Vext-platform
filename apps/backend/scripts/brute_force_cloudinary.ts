import { v2 as cloudinary } from 'cloudinary';
import path from 'path';

const cloudName = 'dzglyaqmf';
const apiKey = '446121212916352';
const filePath = path.resolve(__dirname, '../../frontend/src/assets/images/default-game.svg');
const publicId = 'assets/default-game';

const combinations: string[] = [];
// Trying I, l, and 1 just in case, though 1 had a hook in the API key
const chars = ['I', 'l', '1'];

for (const c1 of chars) {
  for (const c2 of chars) {
    for (const c3 of chars) {
      combinations.push(`NS2Hcivq${c1}_tH${c2}${c3}CfMMrHxHxJPH8`);
    }
  }
}

const run = async () => {
  for (const secret of combinations) {
    console.log(`Trying: ${secret}`);
    // RESET config every time
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: secret,
      secure: true,
    });

    try {
      const result = await cloudinary.uploader.upload(filePath, {
        public_id: publicId,
        overwrite: true,
        resource_type: 'image',
      });
      console.log('SUCCESS!');
      console.log('Correct Secret:', secret);
      console.log('URL:', result.secure_url);
      process.exit(0);
    } catch (error: any) {
      console.log(`Failed for ${secret.substring(8, 15)}: ${error.message}`);
    }
  }
  console.log('All 27 combinations failed.');
};

run();
