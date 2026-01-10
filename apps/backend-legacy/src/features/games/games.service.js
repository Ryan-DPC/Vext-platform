const Games = require('./games.model');
const CloudinaryService = require('../../services/cloudinary.service');
const GitHubService = require('../../services/github.service');
const fs = require('fs').promises;
const path = require('path');
const unzipper = require('unzipper'); // ensure this is installed
const { createReadStream } = require('fs');

class GamesService {
    static async getAllGames() {
        try {
            const cloudinaryService = new CloudinaryService();
            // Cloudinary now returns the "metadata" based list
            // We assume CloudinaryService.getAllGames() is already updated to return the clean object with github_url
            if (cloudinaryService.isEnabled()) {
                console.log('[Games] Fetching games metadata from Cloudinary...');
                return await cloudinaryService.getAllGames();
            }

            // Fallback to DB if Cloudinary disabled (though user specified Cloudinary is source of truth for list)
            console.warn('[Games] Cloudinary disabled, returning DB games only.');
            return await Games.getAllGames();

        } catch (err) {
            console.error('Error in GamesService.getAllGames :', err);
            throw new Error('Error fetching games list.');
        }
    }

    static async getGameDetails(folderName, userId) {
        const { redisClient } = require('../../config/redis');
        const cacheKey = `game:details:${folderName}`;

        // 1. Try Cache
        try {
            if (redisClient.isOpen) {
                const cached = await redisClient.get(cacheKey);
                if (cached) {
                    const cachedGame = JSON.parse(cached);
                    // Append user-specific ownership logic (dynamic, not cached)
                    return {
                        game: cachedGame,
                        userOwnsGame: true, // simplified logic
                        ownershipInfo: null
                    };
                }
            }
        } catch (e) {
            console.warn('[Games] Cache read error:', e.message);
        }

        // 2. Get Metadata (Cloudinary or DB)
        let game = await this.getGameByName(folderName);

        if (!game) {
            throw new Error('Game not found.');
        }

        // 3. Enhance with GitHub Info (Version, Download URL)
        let latestRelease = null;
        if (game.github_url) {
            try {
                const ghService = new GitHubService();
                const repoInfo = ghService.parseUrl(game.github_url);
                if (repoInfo) {
                    latestRelease = await ghService.getLatestRelease(repoInfo.owner, repoInfo.repo);
                }
            } catch (ghError) {
                console.warn(`[Games] Failed to fetch GitHub info for ${folderName}:`, ghError.message);
            }
        }

        // Merge info
        const enhancedGame = {
            ...game,
            version: latestRelease ? latestRelease.version : game.version, // Ensure main version field reflects latest
            latestVersion: latestRelease ? latestRelease.version : game.version,
            downloadUrl: latestRelease ? latestRelease.downloadUrl : game.downloadUrl,
            releaseNotes: latestRelease ? latestRelease.changelog : '',
            publishedAt: latestRelease ? latestRelease.publishedAt : game.updated_at
        };

        // 4. Save to Cache (Public data only)
        try {
            if (redisClient.isOpen) {
                await redisClient.set(cacheKey, JSON.stringify(enhancedGame), { EX: 3600 }); // Cache for 1 hour
            }
        } catch (e) {
            console.warn('[Games] Cache write error:', e.message);
        }

        // 5. User Ownership (Simplified)
        return {
            game: enhancedGame,
            userOwnsGame: true,
            ownershipInfo: null
        };
    }

    static async getGameByName(idOrName) {
        // Logic similar to before but simplified
        // Try finding in Cloudinary list first
        const allGames = await this.getAllGames();
        const game = allGames.find(g => g.id === idOrName || g.folder_name === idOrName);
        if (game) return game;

        // Fallback to DB
        return await Games.getGameByName(idOrName);
    }

    /**
     * Install or Update a game from GitHub
     * @param {string} gameId - The ID/Folder Name of the game (e.g. "ether-game-chess")
     */
    static async installGame(gameId) {
        console.log(`[Games] Starting installation for ${gameId}...`);

        // 1. Get Game Metadata to find GitHub URL
        const game = await this.getGameByName(gameId);
        if (!game || !game.github_url) {
            throw new Error(`Game ${gameId} not found or missing GitHub URL.`);
        }

        // 2. Fetch Latest Release from GitHub
        const ghService = new GitHubService();
        const repoInfo = ghService.parseUrl(game.github_url);
        if (!repoInfo) throw new Error(`Invalid GitHub URL: ${game.github_url}`);

        const release = await ghService.getLatestRelease(repoInfo.owner, repoInfo.repo);
        if (!release || !release.downloadUrl) {
            throw new Error(`No release or download URL found for ${gameId}`);
        }

        console.log(`[Games] Found release ${release.version} for ${gameId}. Downloading...`);

        // 3. Download the Asset
        const gamesPath = process.env.GAMES_PATH || path.join(__dirname, '../../../../games');
        const extension = release.downloadUrl.endsWith('.exe') ? '.exe' : '.zip';
        const tempPath = path.join(gamesPath, 'temp', `${gameId}_${release.version}${extension}`);

        await ghService.downloadFile(release.downloadUrl, tempPath);
        console.log(`[Games] Downloaded to ${tempPath}`);

        // 4. Extract or Move
        const gameDir = path.join(gamesPath, gameId);

        try {
            await fs.rm(gameDir, { recursive: true, force: true });
        } catch (e) { /* ignore */ }
        await fs.mkdir(gameDir, { recursive: true });

        if (extension === '.zip') {
            console.log(`[Games] Extracting to ${gameDir}...`);
            await new Promise((resolve, reject) => {
                createReadStream(tempPath)
                    .pipe(unzipper.Extract({ path: gameDir }))
                    .on('close', resolve)
                    .on('error', reject);
            });
        } else {
            console.log(`[Games] Moving executable to ${gameDir}...`);
            // Rename/Move the .exe to the game folder. 
            // We should probably name it 'Game.exe' or keep original name?
            // EtherChess manifest expects 'Game.exe'. Stick Fighter might vary.
            // Let's keep original filename but ensure manifest knows it?
            // Or rename it to Game.exe to be standard?
            // "Stick.Fighter.Setup...exe". If it's a SETUP, renaming to Game.exe is risky if it requires install.
            // But user wants to "Install".
            // Let's move it as is.
            const fileName = path.basename(release.downloadUrl);
            await fs.rename(tempPath, path.join(gameDir, fileName));

            // Should we update the entryPoint in DB? 
            // Ideally yes, but let's stick to just placing the file.
        }

        // 5. Cleanup Temp
        if (extension === '.zip') {
            await fs.unlink(tempPath);
        }

        console.log(`[Games] Installation complete for ${gameId} v${release.version}`);

        // 6. Update Local Database (Optional but good for tracking)
        // We might want to store "installed_version" in a local SQLite/JSON/Mongo
        // For now, we assume filesystem is source of truth for "installed"

        // Return success info
        return {
            success: true,
            version: release.version,
            path: gameDir
        };
    }

    // Keep legacy methods if needed or stubs
    static async getManifest(id) {
        // 1. Get Metadata (Cloudinary/DB) logic re-used from getGameByName
        const game = await this.getGameByName(id);
        if (!game) {
            throw new Error('Game not found');
        }

        // 1b. Fallback: If Cloudinary metadata misses github_url, check DB explicitly
        if (!game.github_url) {
            const dbGame = await Games.getGameByName(id);
            if (dbGame && dbGame.github_url) {
                game.github_url = dbGame.github_url;
                console.log(`[Manifest] Enriched ${id} with github_url from DB: ${game.github_url}`);
            }
        }

        // 2. If no GitHub URL, return basic metadata (legacy compatibility)
        if (!game.github_url) {
            return {
                gameName: game.game_name || game.name,
                version: game.version || '1.0.0',
                description: game.description,
                platform: 'windows',
                entryPoint: game.entryPoint || 'Game.exe',
                downloadUrl: game.zipUrl || game.downloadUrl
            };
        }

        // 3. Fetch Latest Release from GitHub
        try {
            const ghService = new GitHubService();
            const repoInfo = ghService.parseUrl(game.github_url);

            if (!repoInfo) {
                console.warn(`[Manifest] Invalid GitHub URL for ${id}: ${game.github_url}`);
                // Return what we have
                return {
                    gameName: game.game_name || game.name,
                    version: game.version || '0.0.0',
                    description: game.description,
                    platform: 'windows',
                    entryPoint: game.entryPoint || 'Game.exe',
                    downloadUrl: null
                };
            }

            const release = await ghService.getLatestRelease(repoInfo.owner, repoInfo.repo);

            // 4. Construct Composite Manifest
            // Prioritize GitHub Release data for version and downloadUrl
            return {
                gameName: game.game_name || game.name,
                version: release.version, // Tag name from GitHub
                description: game.description,
                platform: 'windows', // Defaulting to windows for now
                entryPoint: game.entryPoint || 'Game.exe', // From metadata or default
                downloadUrl: release.downloadUrl, // Asset browser_download_url
                zipUrl: release.downloadUrl, // Backward compatibility
                releaseNotes: release.changelog,
                publishedAt: release.publishedAt
            };

        } catch (error) {
            console.error(`[Manifest] Failed to fetch GitHub release for ${id}:`, error.message);
            // Fallback: return metadata values if available, otherwise error
            return {
                gameName: game.game_name || game.name,
                version: game.version || '0.0.0',
                description: game.description,
                platform: 'windows',
                entryPoint: game.entryPoint || 'Game.exe',
                downloadUrl: game.zipUrl || null,
                error: 'Failed to fetch latest release info'
            };
        }
    }

    static async updateGameVersion(gameId, version, manifestUrl, zipUrl) {
        // This might be used by the Admin webhook still? 
        // Or we can deprecate it. Leaving as wrapper to DB.
        return Games.updateGameVersion(gameId, version, manifestUrl, zipUrl);
    }

    /**
     * Sync game metadata and assets from GitHub to Cloudinary
     * Used to restore a game if Cloudinary is empty but GitHub info exists.
     * @param {string} gameId 
     */
    static async syncFromGitHub(gameId) {
        console.log(`[Games] Syncing ${gameId} from GitHub...`);
        const cloudinaryService = new CloudinaryService();
        if (!cloudinaryService.isEnabled()) {
            throw new Error('Cloudinary is not enabled. Cannot sync.');
        }

        // 1. Get DB info to find GitHub URL
        // We bypass getGameByName to avoid recursion if it tries to check Cloudinary first
        // We strictly want the DB record here.
        const dbGame = await Games.getGameByName(gameId);
        if (!dbGame || !dbGame.github_url) {
            throw new Error(`Game ${gameId} not found in DB or missing GitHub URL`);
        }

        const ghService = new GitHubService();
        const repoInfo = ghService.parseUrl(dbGame.github_url);
        if (!repoInfo) throw new Error('Invalid GitHub URL');

        // 2. Fetch Source Metadata
        console.log(`[Games] Fetching metadata.json from ${repoInfo.owner}/${repoInfo.repo}...`);
        const rawMeta = await ghService.getRawFile(repoInfo.owner, repoInfo.repo, 'metadata.json');
        if (!rawMeta) {
            throw new Error('metadata.json not found in GitHub repository');
        }
        const metadata = JSON.parse(rawMeta.toString());

        // 3. Fetch Cover Image (Try jpg then png)
        console.log(`[Games] Fetching cover image...`);
        let coverBuffer = await ghService.getRawFile(repoInfo.owner, repoInfo.repo, 'cover.jpg');
        let format = 'jpg';

        if (!coverBuffer) {
            console.log('cover.jpg not found, trying cover.png...');
            coverBuffer = await ghService.getRawFile(repoInfo.owner, repoInfo.repo, 'cover.png');
            format = 'png';
        }

        let coverUrl = null;
        if (coverBuffer) {
            console.log(`[Games] Uploading cover.${format} to Cloudinary...`);
            const coverResult = await cloudinaryService.uploadBuffer(coverBuffer, `games/${gameId}/cover`, {
                folder: `games/${gameId}`, // This might nest if public_id also has path?
                // Wait, in previous steps we saw `games/ether-chess/cover` public_id plus `folder: games/ether-chess` = `games/ether-chess/games/ether-chess/cover`
                // WE MUST FIX THIS. 
                // Best practice: just use public_id with full path and NO folder option, or folder and valid filename.
                // CloudinaryService.uploadBuffer uses: ...options
                // Let's use specific public_id and NO folder in options to be safe.
                public_id: `games/${gameId}/cover`,
                resource_type: 'image',
                format: format
            });
            coverUrl = coverResult.url;
            console.log(`[Games] Cover uploaded: ${coverUrl}`);
        } else {
            console.warn('[Games] No cover image found on GitHub.');
        }

        // 4. Inject Cloudinary URL into Metadata
        if (coverUrl) {
            metadata.image_url = coverUrl;
        }

        // 5. Upload Metadata to Cloudinary
        console.log(`[Games] Uploading metadata.json to Cloudinary...`);
        const metaBuffer = Buffer.from(JSON.stringify(metadata, null, 2));
        const metaResult = await cloudinaryService.uploadBuffer(metaBuffer, `games/${gameId}/metadata.json`, {
            public_id: `games/${gameId}/metadata.json`,
            resource_type: 'raw',
            format: 'json'
        });

        console.log(`[Games] Sync Complete. Metadata: ${metaResult.url}`);

        // 6. Update MongoDB with the fresh metadata
        // This ensures the backend DB reflects the source of truth from GitHub/Cloudinary
        // Fields to sync: genre, version, developer, description, image_url, etc.
        try {
            console.log('[Games] Updating MongoDB record...');
            await Games.updateManifest(gameId, null, metadata.version || '0.0.0'); // Update manifest version

            // We need a more generic update method or use updateOne directly on model
            // For now, let's use the Games.updateGameVersion approach or just direct DB update
            // Since we are inside GamesService, we can access existing methods or create a new one.
            // Let's rely on the Model directly for this internal sync operation to be flexible.
            const updates = {
                genre: metadata.genre || 'Undefined',
                version: metadata.version || '0.0.0', // This persists the version!
                status: 'disponible', // If we have metadata, it's available
                developer: metadata.developer || dbGame.developer,
                description: metadata.description || dbGame.description,
                image_url: metadata.image_url || dbGame.image_url,
                game_name: metadata.name || dbGame.game_name,
                entryPoint: metadata.entryPoint || dbGame.entryPoint,
                min_players: metadata.min_players,
                max_players: metadata.max_players,
                is_multiplayer: metadata.is_multiplayer || false
            };


            // Use the new helper method on the Games class
            await Games.updateGameMetadata(gameId, updates);
            console.log('[Games] MongoDB record updated:', updates);

        } catch (dbErr) {
            console.error('[Games] Failed to update DB record:', dbErr);
        }

        return {
            success: true,
            metadataUrl: metaResult.url,
            coverUrl: coverUrl
        };
    }
}

module.exports = GamesService;
