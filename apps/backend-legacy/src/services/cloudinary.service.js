const cloudinary = require('cloudinary').v2;
const fs = require('fs').promises;
const path = require('path');
const getCloudinaryCache = require('./cloudinaryCache.service');
const SlugService = require('./slug.service');
const logger = require('../utils/logger');

class CloudinaryService {
    constructor() {
        const cloudinaryUrl = process.env.CLOUDINARY_URL;

        if (cloudinaryUrl) {
            cloudinary.config({
                cloudinary_url: cloudinaryUrl,
            });
            this.enabled = true;
            if (!CloudinaryService.initialized) {
                logger.debug('[Cloudinary] ✅ Cloudinary configured via CLOUDINARY_URL');
                CloudinaryService.initialized = true;
            }
        } else {
            const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
            const apiKey = process.env.CLOUDINARY_API_KEY;
            const apiSecret = process.env.CLOUDINARY_API_SECRET;

            if (cloudName && apiKey && apiSecret) {
                cloudinary.config({
                    cloud_name: cloudName,
                    api_key: apiKey,
                    api_secret: apiSecret,
                });
                this.enabled = true;
                if (!CloudinaryService.initialized) {
                    logger.debug('[Cloudinary] ✅ Cloudinary configured via variables');
                    CloudinaryService.initialized = true;
                }
            } else {
                this.enabled = false;
                if (!CloudinaryService.initialized) {
                    logger.warn('[Cloudinary] ⚠️ Cloudinary not configured');
                    CloudinaryService.initialized = true;
                }
            }
        }
    }

    async uploadFile(filePath, publicId, options = {}) {
        if (!this.enabled) throw new Error('Cloudinary not configured');

        try {
            const result = await cloudinary.uploader.upload(filePath, {
                public_id: publicId,
                resource_type: 'auto',
                overwrite: true,
                ...options,
            });

            return {
                url: result.secure_url,
                publicId: result.public_id,
                version: result.version,
                format: result.format,
                bytes: result.bytes,
            };
        } catch (error) {
            logger.error(`[Cloudinary] Error uploading ${filePath}: ${error.message}`);
            throw error;
        }
    }

    async uploadBuffer(buffer, publicId, options = {}) {
        if (!this.enabled) throw new Error('Cloudinary not configured');

        return new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream(
                {
                    public_id: publicId,
                    resource_type: 'auto',
                    overwrite: true,
                    ...options,
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve({
                        url: result.secure_url,
                        publicId: result.public_id,
                        version: result.version,
                        format: result.format,
                        bytes: result.bytes,
                    });
                }
            ).end(buffer);
        });
    }

    async getBaseUrl() {
        if (!this.enabled) return null;
        const config = cloudinary.config();
        const cloudName = config.cloud_name || this.extractCloudNameFromUrl();
        if (!cloudName) return null;
        return `https://res.cloudinary.com/${cloudName}`;
    }

    extractCloudNameFromUrl() {
        const cloudinaryUrl = process.env.CLOUDINARY_URL;
        if (!cloudinaryUrl) return null;
        const match = cloudinaryUrl.match(/@([^/]+)/);
        return match ? match[1] : null;
    }

    getPublicUrl(publicId, resourceType = 'raw') {
        if (!this.enabled) return null;
        const config = cloudinary.config();
        const cloudName = config.cloud_name || process.env.CLOUDINARY_CLOUD_NAME || this.extractCloudNameFromUrl();
        if (!cloudName) return null;
        return `https://res.cloudinary.com/${cloudName}/${resourceType}/upload/${publicId}`;
    }

    getSignedUrl(publicId, resourceType = 'raw', version = null) {
        if (!this.enabled) return null;
        try {
            const config = cloudinary.config();
            const apiKey = config.api_key || process.env.CLOUDINARY_API_KEY;
            const apiSecret = config.api_secret || process.env.CLOUDINARY_API_SECRET;

            if (!apiKey || !apiSecret) {
                logger.error('[Cloudinary] Missing API Key or Secret for signing');
                return null;
            }

            // Strategy 4: Use private_download_url for raw files
            // This generates a URL to the API download endpoint which handles the auth and redirect
            if (resourceType === 'raw') {
                // Extract format from publicId if present (e.g. 'game.zip' -> 'zip')
                const extension = publicId.split('.').pop();
                const format = extension !== publicId ? extension : '';

                const url = cloudinary.utils.private_download_url(publicId, format, {
                    resource_type: resourceType,
                    type: 'upload',
                    expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour
                    attachment: true // Force download
                });

                return url;
            }

            // Fallback for non-raw resources (images etc) - use standard signing
            const options = {
                resource_type: resourceType,
                type: 'upload',
                sign_url: true,
                secure: true
            };

            if (version) {
                options.version = version;
            }

            return cloudinary.url(publicId, options);
        } catch (error) {
            logger.error(`[Cloudinary] Error signing URL: ${error.message}`);
            return null;
        }
    }

    async getResourceDetails(publicId, resourceType = 'raw') {
        if (!this.enabled) return null;
        try {
            // Use Admin API to get details
            const result = await cloudinary.api.resource(publicId, {
                resource_type: resourceType
            });
            return result;
        } catch (error) {
            logger.error(`[Cloudinary] Error getting resource details: ${error.message}`);
            return null;
        }
    }

    /**
     * List all available games by finding metadata.json files in games/ folder
     * @param {boolean} clearCache 
     * @returns {Promise<Array>} List of game metadata objects
     */
    async listGamesMetadata(clearCache = false) {
        if (!this.enabled) throw new Error('Cloudinary not configured');

        const cache = getCloudinaryCache();
        if (!clearCache && cache.isEnabled()) {
            const cached = await cache.getManifestsList(); // We reuse the "ManifestsList" cache key concept but for metadata
            if (cached) return cached;
        }

        if (clearCache && cache.isEnabled()) {
            await cache.clearAll();
        }

        try {
            // List all raw files in games folder
            // We search for "metadata.json" specifically is logically better but Cloudinary API 
            // is prefix-based. We'll list resources in 'games/' and filter in JS.
            // Alternatively, we can use search API if available (Tier dependent), 
            // but sticking to resources listing is safer for standard tiers.

            // To optimize, we list resources with prefix 'games/' and type 'raw'
            let allResources = [];
            let nextCursor = null;

            do {
                const result = await cloudinary.api.resources({
                    type: 'upload',
                    resource_type: 'raw',
                    prefix: 'games/',
                    max_results: 500,
                    next_cursor: nextCursor
                });

                allResources = allResources.concat(result.resources);
                nextCursor = result.next_cursor;
            } while (nextCursor);

            // Filter for files ending in /metadata.json
            // Expected format: games/{folderName}/metadata.json
            const metadataFiles = allResources.filter(r => r.public_id.endsWith('/metadata.json'));

            if (metadataFiles.length === 0) {
                logger.warn('[Cloudinary] ⚠️ No metadata.json files found in "games/" folder.');
            }

            // Fetch content for each metadata file (in parallel)
            const gamesMetadata = await Promise.all(metadataFiles.map(async (resource) => {
                try {
                    // Extract folder name: games/chess/metadata.json -> chess
                    const parts = resource.public_id.split('/');
                    if (parts.length < 3) return null; // unexpected structure
                    const folderName = parts[parts.length - 2];

                    const url = resource.secure_url;

                    // Fetch the JSON content
                    const response = await fetch(url);
                    if (!response.ok) return null;
                    const metadata = await response.json();

                    return {
                        id: folderName, // Use folder name as ID
                        folderName: folderName,
                        ...metadata, // Spread metadata (name, description, tags, github_url, etc)
                        metadataUrl: url,
                        updatedAt: resource.updated_at
                    };
                } catch (err) {
                    logger.error(`[Cloudinary] Error fetching metadata for ${resource.public_id}: ${err.message}`);
                    return null;
                }
            }));

            // Filter out nulls
            const validGames = gamesMetadata.filter(g => g !== null);

            if (cache.isEnabled()) {
                await cache.setManifestsList(validGames); // Reuse cache key
            }

            return validGames;
        } catch (error) {
            logger.error(`[Cloudinary] Error listing games metadata: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get metadata for a specific game
     * @param {string} folderName 
     */
    async getGameMetadata(folderName) {
        if (!this.enabled) throw new Error('Cloudinary not configured');

        const cache = getCloudinaryCache();
        if (cache.isEnabled()) {
            const cached = await cache.getManifest(folderName);
            if (cached) return cached;
        }

        // Check cache via list first if possible, or fetch directly
        try {
            const publicId = `games/${folderName}/metadata.json`;
            const url = this.getPublicUrl(publicId, 'raw');

            const response = await fetch(url);
            if (!response.ok) throw new Error(`Metadata not found: ${response.status}`);

            const metadata = await response.json();

            if (cache.isEnabled()) {
                await cache.setManifest(folderName, metadata);
            }

            return metadata;
        } catch (error) {
            logger.error(`[Cloudinary] Error getting metadata for ${folderName}: ${error.message}`);
            throw error;
        }
    }

    async getAllGames(clearCache = false) {
        if (!this.enabled) throw new Error('Cloudinary not configured');

        // We delegate caching to listGamesMetadata
        try {
            const gamesMetadata = await this.listGamesMetadata(clearCache);

            // Fetch prices from SlugService (optional, depends if we still use slugs for prices)
            const slugService = new SlugService();
            const slugPrices = await slugService.getAllPrices();
            this.slugPrices = slugPrices;

            // Map to unified Game object structure
            const games = gamesMetadata.map(meta => {
                // Construct image URLs
                // Prioritize explicit image_url in metadata
                // Fallback to standard convention: games/{folderName}/cover.jpg
                const fallbackUrl = this.getPublicUrl(`games/${meta.folderName}/cover.jpg`, 'image');
                const coverUrl = meta.image_url || fallbackUrl;

                return {
                    id: meta.folderName, // e.g. "ether-chess"
                    game_name: meta.name || meta.folderName,
                    folder_name: meta.folderName,
                    description: meta.description || '',
                    image_url: coverUrl, // fallback handled by frontend or use default
                    status: 'disponible', // Default status
                    genre: meta.genre || (meta.tags && meta.tags[0]) || 'Undefined',
                    max_players: meta.max_players || 1, // Metadata might need this field if relevant
                    is_multiplayer: meta.is_multiplayer !== undefined ? meta.is_multiplayer : (meta.tags ? meta.tags.includes('multiplayer') : false),
                    developer: meta.developer || 'Inconnu',
                    price: this.slugPrices?.[meta.folderName] !== undefined
                        ? this.slugPrices[meta.folderName]
                        : (meta.price || 0),
                    version: meta.version || 'latest', // Managed by GitHub but prefer metadata version
                    github_url: meta.github_url,
                    tags: meta.tags || [],
                    created_at: meta.updatedAt,
                    updated_at: meta.updatedAt,
                };
            });

            return games;
        } catch (error) {
            logger.error(`[Cloudinary] Error fetching all games: ${error.message}`);
            throw error;
        }
    }

    isEnabled() {
        return this.enabled;
    }
}

module.exports = CloudinaryService;
CloudinaryService.initialized = false;
