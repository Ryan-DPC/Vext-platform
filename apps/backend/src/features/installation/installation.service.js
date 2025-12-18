const path = require('path');
const GameInstallation = require('./game-installation.model');
const Games = require('../games/games.model');
const pathConfigService = require('./path-config.service');
const downloadService = require('./download.service');
const extractionService = require('./extraction.service');
const versionService = require('./version.service');
const fs = require('fs').promises; // Added for file operations

class InstallationService {
    /**
     * Install a game
     * @param {string} userId - User ID
     * @param {string} gameId - Game ID or folder_name
     * @param {object} io - Socket.io instance
     * @returns {Promise<object>}
     */
    async installGame(userId, gameId, io) {
        try {
            console.log(`[Installation] Starting installation for game ${gameId}, user ${userId}`);
            const mongoose = require('mongoose');

            // Convert gameId to string and detect if it's a folder_name or ObjectId
            let gameIdStr = String(gameId).trim();
            let folderName = null;

            // If it's not a valid ObjectId, assume it's a folder_name
            if (!mongoose.Types.ObjectId.isValid(gameIdStr)) {
                folderName = gameIdStr;
                console.log(`[Installation] Non-ObjectId detected, using as folder_name: ${folderName}`);
            }

            // 1. Check if install path is configured
            const isConfigured = await pathConfigService.isPathConfigured(userId);
            if (!isConfigured) {
                throw new Error('Install path not configured. Please set your installation path first.');
            }

            // 2. Get game details
            let game = null;
            if (mongoose.Types.ObjectId.isValid(gameIdStr)) {
                game = await Games.getGameById(gameIdStr);
            }
            if (!game && folderName) {
                game = await Games.getGameByName(folderName);
            }

            if (!game) {
                throw new Error('Game not found');
            }

            // Use the actual game _id for database operations
            const actualGameId = game._id || game.id;

            // Ensure game has ZIP URL
            if (!game.zipUrl) {
                throw new Error('Game ZIP file not available on Cloudinary');
            }

            // 3. Check if already installed
            const existing = await GameInstallation.findOne({ user_id: userId, game_id: actualGameId });
            if (existing && existing.status === 'installed') {
                throw new Error('Game is already installed');
            }

            // 4. Get game path
            const gamePath = await pathConfigService.getGamePath(userId, game.folder_name);

            // 5. Create installation record
            const installation = await GameInstallation.findOneAndUpdate(
                { user_id: userId, game_id: actualGameId },
                {
                    version: game.manifestVersion || '1.0.0',
                    local_path: gamePath,
                    status: 'installing',
                    installed_at: new Date()
                },
                { upsert: true, new: true }
            );

            // 6. Download ZIP
            const zipPath = path.join(gamePath, 'game.zip');
            await downloadService.downloadFile(game.zipUrl, zipPath, userId, actualGameId.toString(), io);

            // 7. Extract ZIP
            await extractionService.extractZip(zipPath, gamePath, userId, actualGameId.toString(), io);

            // 8. Validate extraction
            const manifest = await versionService.getLatestManifest(actualGameId);
            const isValid = await extractionService.validateExtraction(gamePath, manifest || {});

            if (!isValid) {
                throw new Error('Extraction validation failed');
            }

            // 9. Update installation status
            await GameInstallation.findByIdAndUpdate(installation._id, {
                status: 'installed',
                last_checked: new Date()
            });

            // 10. Emit completion event
            io.to(userId).emit('installation:complete', {
                gameId: actualGameId.toString(),
                gameName: game.game_name,
                version: game.manifestVersion || '1.0.0'
            });

            console.log(`[Installation] ✅ Successfully installed ${game.game_name}`);

            return {
                success: true,
                gameName: game.game_name,
                version: game.manifestVersion || '1.0.0',
                path: gamePath
            };

        } catch (error) {
            console.error(`[Installation] Error installing game ${gameId}:`, error);

            // Try to get actualGameId for error handling
            try {
                const mongoose = require('mongoose');
                let errorGameId = gameId;

                if (!mongoose.Types.ObjectId.isValid(String(gameId))) {
                    const game = await Games.getGameByName(String(gameId));
                    if (game) {
                        errorGameId = game._id || game.id;
                    }
                }

                // Update status to failed
                await GameInstallation.findOneAndUpdate(
                    { user_id: userId, game_id: errorGameId },
                    {
                        status: 'failed',
                        error_message: error.message
                    }
                );
            } catch (updateError) {
                console.error('[Installation] Failed to update error status:', updateError);
            }

            // Emit error event
            io.to(userId).emit('installation:error', {
                gameId: String(gameId),
                error: error.message
            });

            throw error;
        }
    }

    /**
     * Update a game
     * @param {string} userId - User ID
     * @param {string} gameId - Game ID
     * @param {object} io - Socket.io instance
     * @returns {Promise<object>}
     */
    async updateGame(userId, gameId, io) {
        try {
            console.log(`[Installation] Starting update for game ${gameId}, user ${userId}`);

            // 1. Check if game is installed
            const installation = await GameInstallation.findOne({ user_id: userId, game_id: gameId });
            if (!installation) {
                throw new Error('Game is not installed');
            }

            // 2. Get game details
            const game = await Games.getGameById(gameId);
            if (!game) {
                throw new Error('Game not found');
            }

            // 3. Verify update is needed
            const { required, currentVersion, latestVersion } = await versionService.isUpdateRequired(gameId, userId);
            if (!required) {
                throw new Error('Game is already up to date');
            }

            console.log(`[Installation] Updating ${game.game_name} from v${currentVersion} to v${latestVersion}`);

            // 4. Set status to updating
            await GameInstallation.findByIdAndUpdate(installation._id, {
                status: 'updating'
            });

            // 5. Prepare Temporary Directory (Safety Patch Strategy)
            // We download/extract to a temp folder first, then merge.
            // This prevents deleting the game if download fails and preserves user data (saves/configs).
            const tempDirName = `.ether_update_${gameId}_${Date.now()}`;
            const installRoot = path.dirname(installation.local_path); // Parent directory (e.g., C:/Games/Ether)
            const tempDir = path.join(installRoot, tempDirName);

            await fs.mkdir(tempDir, { recursive: true });
            console.log(`[Installation] Created temp dir: ${tempDir}`);

            try {
                // 6. Download new version to Temp
                const zipPath = path.join(tempDir, 'game.zip');
                await downloadService.downloadFile(game.zipUrl, zipPath, userId, gameId, io);

                // 7. Extract new version to Temp
                await extractionService.extractZip(zipPath, tempDir, userId, gameId, io);

                // 8. Validate extraction (in Temp)
                const manifest = await versionService.getLatestManifest(gameId);
                const isValid = await extractionService.validateExtraction(tempDir, manifest || {});

                if (!isValid) {
                    throw new Error('Extraction validation failed (Integrity Check)');
                }

                // 9. Merge / Apply Update
                // Copy files from Temp to Real Path (Overwriting existing ones)
                // This acts as a "Patch" over the existing installation.
                console.log(`[Installation] Applying update to: ${installation.local_path}`);
                await fs.cp(tempDir, installation.local_path, { recursive: true, force: true });

            } catch (innerError) {
                // Cleanup temp on error
                await extractionService.cleanup(tempDir);
                throw innerError;
            }

            // Cleanup temp after success
            await extractionService.cleanup(tempDir);

            // 10. Update installation record
            await GameInstallation.findByIdAndUpdate(installation._id, {
                status: 'installed',
                version: latestVersion,
                last_checked: new Date()
            });

            // 11. Emit completion event
            io.to(userId).emit('installation:complete', {
                gameId,
                gameName: game.game_name,
                version: latestVersion
            });

            console.log(`[Installation] ✅ Successfully updated ${game.game_name} to v${latestVersion}`);

            return {
                success: true,
                gameName: game.game_name,
                version: latestVersion,
                path: installation.local_path
            };

        } catch (error) {
            console.error(`[Installation] Error updating game ${gameId}:`, error);

            // Update status to failed
            await GameInstallation.findOneAndUpdate(
                { user_id: userId, game_id: gameId },
                {
                    status: 'failed',
                    error_message: error.message
                }
            );

            // Emit error event
            io.to(userId).emit('installation:error', {
                gameId,
                error: error.message
            });

            throw error;
        }
    }

    /**
     * Get installation status for a game
     * @param {string} userId - User ID
     * @param {string} gameId - Game ID
     * @returns {Promise<object|null>}
     */
    async getInstallStatus(userId, gameId) {
        const installation = await GameInstallation.findOne({ user_id: userId, game_id: gameId });
        if (!installation) {
            return null;
        }

        // Check if update is available
        const { required, currentVersion, latestVersion } = await versionService.isUpdateRequired(gameId, userId);

        return {
            installed: installation.status === 'installed',
            status: installation.status,
            version: installation.version,
            localPath: installation.local_path,
            updateAvailable: required,
            currentVersion,
            latestVersion,
            lastChecked: installation.last_checked,
            errorMessage: installation.error_message
        };
    }

    /**
     * Cancel an installation/update
     * @param {string} userId - User ID
     * @param {string} gameId - Game ID
     */
    async cancelInstallation(userId, gameId) {
        // Cancel download
        downloadService.cancelDownload(gameId);

        // Update status
        await GameInstallation.findOneAndUpdate(
            { user_id: userId, game_id: gameId },
            {
                status: 'failed',
                error_message: 'Installation cancelled by user'
            }
        );

        console.log(`[Installation] Cancelled installation for game ${gameId}`);
    }

    /**
     * Get all installed games for a user
     * @param {string} userId - User ID
     * @returns {Promise<Array>}
     */
    async getUserInstalledGames(userId) {
        return await GameInstallation.find({ user_id: userId })
            .populate('game_id')
            .lean();
    }
    /**
     * Update installation status (called by Electron app)
     * @param {string} userId - User ID
     * @param {string} gameId - Game ID
     * @param {string} status - New status
     * @param {string} localPath - Installation path
     */
    async updateInstallationStatus(userId, gameId, status, localPath) {
        const mongoose = require('mongoose');
        let actualGameId = gameId;

        // Resolve game ID if it's a folder name
        if (!mongoose.Types.ObjectId.isValid(gameId)) {
            const game = await Games.getGameByName(gameId);
            if (game) {
                actualGameId = game._id;
            }
        }

        return await GameInstallation.findOneAndUpdate(
            { user_id: userId, game_id: actualGameId },
            {
                status,
                local_path: localPath,
                installed_at: status === 'installed' ? new Date() : undefined,
                last_checked: new Date()
            },
            { upsert: true, new: true }
        );
    }
}

module.exports = new InstallationService();
