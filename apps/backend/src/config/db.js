const mongoose = require('mongoose');

async function connectDB() {
    const uri = process.env.MONGO_URI;
    if (!uri) {
        console.error('MONGO_URI is not defined');
        process.exit(1);
    }

    try {
        mongoose.set('strictQuery', true);
        await mongoose.connect(uri, {
            autoIndex: true,
            serverSelectionTimeoutMS: 10000,
            maxPoolSize: 10,
        });
        console.log('MongoDB Connected');
    } catch (err) {
        console.error('MongoDB Connection Error:', err);
        process.exit(1);
    }
}

module.exports = connectDB;
