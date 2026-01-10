const cron = require('node-cron');
const GameInstallation = require('../features/installation/game-installation.model');
const Games = require('../features/games/games.model');
const versionService = require('../features/installation/version.service');

class VersionCheckerJob {
    constructor(io) {
        this.io = io;
        this.job = null;
    }

    /**
     * Start the version checker job (runs every 3 hours)
     */
    start() {
        // Schedule: At minute 0 past every 3rd hour (0 */3 * * *)
        this.job = cron.schedule('0 */3 * * *', async () => {
            console.log('[VersionChecker] Starting version check...');
            await this.checkAllGamesForUpdates();
        });

        console.log('[VersionChecker] Job scheduled to run every 3 hours');
    }

    /**
     * Stop the version checker job
     */
    stop() {
        if (this.job) {
            this.job.stop();
            console.log('[VersionChecker] Job stopped');
        }
    }

    /**
     * Check all installed games for updates
     */
    async checkAllGamesForUpdates() {
        try {
            // Get all installed games
            const installations = await GameInstallation.find({ status: 'installed' })
                .populate('user_id')
                .populate('game_id')
                .lean();

            console.log(`[VersionChecker] Checking ${installations.length} installations for updates...`);

            let updatesFound = 0;

            for (const installation of installations) {
                if (!installation.game_id || !installation.user_id) {
                    continue;
                }

                const gameId = installation.game_id._id || installation.game_id;
                const userId = installation.user_id._id || installation.user_id;

                try {
                    // Get latest manifest from Cloudinary
                    const manifest = await versionService.getLatestManifest(gameId);
                    if (!manifest || !manifest.version) {
                        continue;
                    }

                    // Compare versions
                    const comparison = versionService.compareVersions(installation.version, manifest.version);

                    if (comparison < 0) {
                        // Update available!
                        console.log(`[VersionChecker] Update available for ${installation.game_id.game_name}: ${installation.version} -> ${manifest.version}`);

                        // Update installation status
                        await GameInstallation.findByIdAndUpdate(installation._id, {
                            status: 'pending_update',
                            last_checked: new Date()
                        });

                        // Update game manifest version in DB
                        await Games.getGameById(gameId); // This will refresh cache if needed

                        // Emit WebSocket notification to user
                        const userIdStr = userId.toString();
                        this.io.to(userIdStr).emit('update:available', {
                            gameId: gameId.toString(),
                            gameName: installation.game_id.game_name,
                            currentVersion: installation.version,
                            newVersion: manifest.version
                        });

                        updatesFound++;
                    } else {
                        // Update last checked timestamp
                        await GameInstallation.findByIdAndUpdate(installation._id, {
                            last_checked: new Date()
                        });
                    }
                } catch (error) {
                    console.error(`[VersionChecker] Error checking game ${installation.game_id.game_name}:`, error.message);
                }
            }

            console.log(`[VersionChecker] ✅ Version check complete. Found ${updatesFound} update(s)`);
        } catch (error) {
            console.error('[VersionChecker] Error in version check job:', error);
        }
    }

    /**
     * Manually trigger a version check (for testing)
     */
    async runNow() {
        console.log('[VersionChecker] Manual trigger');
        await this.checkAllGamesForUpdates();
    }
}

module.exports = VersionCheckerJob;
