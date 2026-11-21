import dotenv from 'dotenv';
import path from 'path';

// Load .env from apps/backend or parent directories
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import mongoose from 'mongoose';
import { createClient } from 'redis';
import { UserModel } from '@vext/database';

async function main() {
    console.log('====================================================');
    console.log('  Testing VPS Connection (MongoDB 7.0 & Redis 7)');
    console.log('  Target VPS Host: 62.238.52.129');
    console.log('====================================================');
    
    // 1. Test Redis
    console.log('\n[1/3] Testing Redis connection...');
    const redisUrl = process.env.REDIS_URL || 'redis://:4b3126019668be9eb1acfd1f1d4ad3fa@62.238.52.129:6379';
    console.log(`Connecting to Redis: ${redisUrl.replace(/:[^:@]+@/, ':****@')}`);
    
    const redisClient = createClient({ url: redisUrl });
    redisClient.on('error', (err) => console.error('Redis Client Error:', err));
    
    await redisClient.connect();
    console.log('Redis Connected');
    
    // Perform Redis test operations
    await redisClient.set('vext:test:connectivity', 'OK_BUN_VPS', { EX: 60 });
    const pingValue = await redisClient.get('vext:test:connectivity');
    console.log(`Redis Read/Write Test: pingValue = "${pingValue}" (SUCCESS)`);
    
    const redisInfo = await redisClient.info('server');
    const redisVersionMatch = redisInfo.match(/redis_version:([^\r\n]+)/);
    const redisVersion = redisVersionMatch ? redisVersionMatch[1] : 'unknown';
    console.log(`Redis Server Version: ${redisVersion}`);

    // 2. Test MongoDB
    console.log('\n[2/3] Testing MongoDB connection...');
    const mongoUri = process.env.MONGODB_URI || 'mongodb://admin:33cfc90fdc61d136e7806ccaab279fee@62.238.52.129:27017/vext_db?authSource=admin';
    console.log(`Connecting to MongoDB: ${mongoUri.replace(/:[^:@]+@/, ':****@')}`);
    
    mongoose.set('strictQuery', true);
    await mongoose.connect(mongoUri, {
        autoIndex: true,
        serverSelectionTimeoutMS: 10000,
        maxPoolSize: 10,
    });
    console.log('MongoDB Connected');
    
    // Database stats & collections
    const db = mongoose.connection.db;
    if (!db) {
        throw new Error('Database connection object is undefined');
    }
    const adminDb = db.admin();
    const buildInfo = await adminDb.buildInfo();
    console.log(`MongoDB Server Version: ${buildInfo.version}`);

    const collections = await db.listCollections().toArray();
    console.log(`Existing collections in vext_db:`, collections.map(c => c.name));

    // 3. Initialize vext_db if needed
    console.log('\n[3/3] Initializing vext_db...');
    
    // Check if test admin user exists
    const adminUser = await UserModel.findOne({ email: 'admin@vext.io' });
    if (!adminUser) {
        console.log('Creating initial test admin user (admin@vext.io)...');
        const hashedPassword = await Bun.password.hash('AdminVext2026!', { algorithm: 'bcrypt', cost: 10 });
        const newAdmin = await UserModel.create({
            username: 'admin#0001',
            email: 'admin@vext.io',
            password: hashedPassword,
            isAdmin: true,
            tokens: 10000,
            currency: 'EUR',
            language: 'French',
            status_message: 'Vext Administrator',
            bio: 'Official Vext Platform Administrator Account',
            balances: { chf: 1000, eur: 1000, usd: 1000, gbp: 1000 }
        });
        console.log(`Admin user created successfully with ID: ${newAdmin._id} (username: ${newAdmin.username})`);
    } else {
        console.log(`Admin user already exists: ${adminUser.username} (${adminUser.email}, ID: ${adminUser._id})`);
    }

    // List collections again to verify
    const updatedCollections = await db.listCollections().toArray();
    console.log(`Collections now present in vext_db:`, updatedCollections.map(c => c.name));

    // Cleanup
    await redisClient.quit();
    await mongoose.disconnect();
    console.log('\nAll tests completed and connections closed cleanly.');
}

main().catch((err) => {
    console.error('Fatal Test Error:', err);
    process.exit(1);
});
