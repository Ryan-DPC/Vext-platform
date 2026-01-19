/* eslint-disable */

const mongoose = require('mongoose');
const path = require('path');
const envPath = path.resolve(__dirname, '../../apps/backend/.env');
require('dotenv').config({ path: envPath });

async function clearUsers() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI not found in env');
    process.exit(1);
  }

  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('✅ Connected.');

    // Depending on how the collection is named, usually 'users' (plural lowercase) from 'User' model
    const result = await mongoose.connection.collection('users').deleteMany({});

    console.log(`✅ Successfully deleted ${result.deletedCount} users.`);
  } catch (error) {
    console.error('❌ Error clearing users:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
}

clearUsers();
