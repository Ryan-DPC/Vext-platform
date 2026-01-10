const { createClient: createRedisClient } = require('redis');
const logger = require('../utils/logger');

class CloudinaryCacheService {
    constructor() {
        this.client = null;
        this.enabled = false;
        this.cachePrefix = 'cloudinary:manifests:';
        this.cacheTTL = 86400; // 24 hours default
        this.init();
    }

    async init() {
        if (!process.env.REDIS_URL) {
            logger.debug('[CloudinaryCache] Redis not configured, cache disabled');
            return;
        }

        try {
            this.client = createRedisClient({ url: process.env.REDIS_URL });
            this.client.on('error', (err) => {
                logger.error(`[CloudinaryCache] Redis Error: ${err.message}`);
                this.enabled = false;
            });

            await this.client.connect();
            this.enabled = true;
            logger.debug('[CloudinaryCache] ✅ Redis Cache enabled for Cloudinary');
        } catch (error) {
            logger.warn(`[CloudinaryCache] ⚠️ Cannot connect to Redis, cache disabled: ${error.message}`);
            this.enabled = false;
        }
    }

    async getManifest(folderName) {
        if (!this.enabled || !this.client) return null;

        try {
            const key = `${this.cachePrefix}manifest:${folderName}`;
            const cached = await this.client.get(key);
            if (cached) {
                return JSON.parse(cached);
            }
            return null;
        } catch (error) {
            logger.error(`[CloudinaryCache] Error getting cache for ${folderName}: ${error.message}`);
            return null;
        }
    }

    async setManifest(folderName, manifest, ttl = null) {
        if (!this.enabled || !this.client) return;

        try {
            const key = `${this.cachePrefix}manifest:${folderName}`;
            const ttlToUse = ttl || this.cacheTTL;
            await this.client.setEx(key, ttlToUse, JSON.stringify(manifest));
        } catch (error) {
            logger.error(`[CloudinaryCache] Error setting cache for ${folderName}: ${error.message}`);
        }
    }

    async getManifestsList() {
        if (!this.enabled || !this.client) return null;

        try {
            const key = `${this.cachePrefix}list:all`;
            const cached = await this.client.get(key);
            if (cached) {
                return JSON.parse(cached);
            }
            return null;
        } catch (error) {
            logger.error(`[CloudinaryCache] Error getting list cache: ${error.message}`);
            return null;
        }
    }

    async setManifestsList(manifests, ttl = null) {
        if (!this.enabled || !this.client) return;

        try {
            const key = `${this.cachePrefix}list:all`;
            const ttlToUse = ttl || this.cacheTTL;
            await this.client.setEx(key, ttlToUse, JSON.stringify(manifests));
        } catch (error) {
            logger.error(`[CloudinaryCache] Error setting list cache: ${error.message}`);
        }
    }

    async invalidateManifest(folderName) {
        if (!this.enabled || !this.client) return;

        try {
            const key = `${this.cachePrefix}manifest:${folderName}`;
            await this.client.del(key);
            await this.client.del(`${this.cachePrefix}list:all`);
        } catch (error) {
            logger.error(`[CloudinaryCache] Error invalidating ${folderName}: ${error.message}`);
        }
    }

    async getGamesList() {
        if (!this.enabled || !this.client) return null;

        try {
            const key = `${this.cachePrefix}games:all`;
            const cached = await this.client.get(key);
            if (cached) {
                return JSON.parse(cached);
            }
            return null;
        } catch (error) {
            logger.error(`[CloudinaryCache] Error getting games list cache: ${error.message}`);
            return null;
        }
    }

    async setGamesList(games, ttl = null) {
        if (!this.enabled || !this.client) return;

        try {
            const key = `${this.cachePrefix}games:all`;
            const ttlToUse = ttl || this.cacheTTL;
            await this.client.setEx(key, ttlToUse, JSON.stringify(games));
            logger.debug(`[CloudinaryCache] ✅ ${games.length} games cached (TTL: ${ttlToUse}s)`);
        } catch (error) {
            logger.error(`[CloudinaryCache] Error setting games list cache: ${error.message}`);
        }
    }

    async clearAll() {
        if (!this.enabled || !this.client) return;

        try {
            const keys = await this.client.keys(`${this.cachePrefix}*`);
            if (keys.length > 0) {
                await this.client.del(keys);
                logger.debug(`[CloudinaryCache] ✅ ${keys.length} cache entries deleted`);
            }
        } catch (error) {
            logger.error(`[CloudinaryCache] Error clearing cache: ${error.message}`);
        }
    }

    isEnabled() {
        return this.enabled;
    }

    async disconnect() {
        if (this.client) {
            await this.client.quit();
            this.enabled = false;
        }
    }
}

let cacheInstance = null;

function getCacheInstance() {
    if (!cacheInstance) {
        cacheInstance = new CloudinaryCacheService();
    }
    return cacheInstance;
}

module.exports = getCacheInstance;
