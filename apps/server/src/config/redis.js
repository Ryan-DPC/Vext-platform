const { createClient } = require('redis');

const redisClient = createClient({
    url: process.env.REDIS_URL,
    socket: {
        reconnectStrategy: false // Fail fast for testing if not available
    }
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));

const connectRedis = async () => {
    if (!redisClient.isOpen) {
        await redisClient.connect();
        console.log('✅ Redis client connected');
    }
    return redisClient;
};

module.exports = {
    redisClient,
    connectRedis
};
