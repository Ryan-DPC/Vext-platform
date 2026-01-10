require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');

const resetDb = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is not defined in .env');
        }

        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        console.log('Dropping database...');
        await mongoose.connection.db.dropDatabase();
        console.log('Database dropped successfully.');

        await mongoose.disconnect();
        console.log('Disconnected.');
        process.exit(0);
    } catch (error) {
        console.error('Error resetting database:', error);
        process.exit(1);
    }
};

resetDb();
