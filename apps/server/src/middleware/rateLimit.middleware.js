const { redisClient } = require('../config/redis');

const RATE_LIMIT_WINDOW = 1; // 1 second
const MAX_REQUESTS = 10; // 10 requests per second

module.exports = async (socket, next) => {
    const userId = socket.userId || socket.id;
    const key = `ratelimit:${userId}`;

    try {
        const requests = await redisClient.incr(key);

        if (requests === 1) {
            await redisClient.expire(key, RATE_LIMIT_WINDOW);
        }

        if (requests > MAX_REQUESTS) {
            socket.emit('error', { message: "Rate limit exceeded" });
            return next(new Error("Rate limit exceeded"));
        }

        next();
    } catch (err) {
        console.error('Rate limit error:', err);
        // Fail open if Redis fails? Or fail closed?
        // Usually fail open to not block users if Redis is down, but here we might want to be safe.
        // Given the user wants robustness, let's log and allow.
        next();
    }
};
