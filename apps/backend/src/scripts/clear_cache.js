const { createClient } = require('redis');
const path = require('path');
const fs = require('fs');

try {
    const backendEnv = path.join(__dirname, '../../.env');
    const rootEnv = path.join(__dirname, '../../../.env');

    let dotenvPath = backendEnv;
    if (!fs.existsSync(backendEnv)) {
        if (fs.existsSync(rootEnv)) {
            dotenvPath = rootEnv;
        }
    }

    require('dotenv').config({ path: dotenvPath });
} catch (e) {
    console.error('Env loading failed', e);
}

async function clearCache() {
    if (!process.env.REDIS_URL) {
        console.log('No REDIS_URL found, nothing to clear (or cache is disabled).');
        return;
    }

    const redisUrl = process.env.REDIS_URL.replace('ether_redis', 'localhost');
    const client = createClient({ url: redisUrl });

    client.on('error', (err) => console.error('Redis Client Error', err));

    try {
        await client.connect();
        console.log('Connected to Redis');

        // Pattern from service: cloudinary:manifests:*
        const keys = await client.keys('cloudinary:manifests:*');

        if (keys.length > 0) {
            console.log(`Found ${keys.length} keys to delete:`, keys);
            await client.del(keys);
            console.log('✅ Cache cleared successfully.');
        } else {
            console.log('No matching keys found.');
        }

    } catch (e) {
        console.error('Error clearing cache:', e);
    } finally {
        await client.disconnect();
        console.log('Disconnected');
    }
}

clearCache();
