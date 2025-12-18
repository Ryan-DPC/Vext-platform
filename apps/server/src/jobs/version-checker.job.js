const cron = require('node-cron');

class VersionCheckerJob {
    constructor(io) {
        this.io = io;
        this.job = null;
    }

    /**
     * Start the version checker job (runs every 3 hours)
     */
    start() {
        // Import models here to avoid circular dependencies
        const mongoose = require('mongoose');

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
            const mongoose = require('mongoose');

            // Define schemas inline to avoid import issues
            const GameInstallation = mongoose.models.GameInstallation || mongoose.model('GameInstallation', new mongoose.Schema({}, { strict: false }));
            const Game = mongoose.models.Game || mongoose.model('Game', new mongoose.Schema({}, { strict: false }));

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
                    const game = installation.game_id;
                    if (!game.manifestUrl) {
                        continue;
                    }

                    const response = await fetch(game.manifestUrl);
                    if (!response.ok) {
                        continue;
                    }

                    const manifest = await response.json();
                    if (!manifest || !manifest.version) {
                        continue;
                    }

                    // Compare versions
                    const comparison = this.compareVersions(installation.version, manifest.version);

                    if (comparison < 0) {
                        // Update available!
                        console.log(`[VersionChecker] Update available for ${game.game_name}: ${installation.version} -> ${manifest.version}`);

                        // Update installation status
                        await GameInstallation.findByIdAndUpdate(installation._id, {
                            status: 'pending_update',
                            last_checked: new Date()
                        });

                        // Emit WebSocket notification to user
                        const userIdStr = userId.toString();
                        this.io.to(userIdStr).emit('update:available', {
                            gameId: gameId.toString(),
                            gameName: game.game_name,
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
                    console.error(`[VersionChecker] Error checking game ${installation.game_id?.game_name}:`, error.message);
                }
            }

            console.log(`[VersionChecker] ✅ Version check complete. Found ${updatesFound} update(s)`);
        } catch (error) {
            console.error('[VersionChecker] Error in version check job:', error);
        }
    }

    /**
     * Compare two semantic versions
     */
    compareVersions(version1, version2) {
        const v1 = version1.split('.').map(Number);
        const v2 = version2.split('.').map(Number);

        for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
            const n1 = v1[i] || 0;
            const n2 = v2[i] || 0;

            if (n1 > n2) return 1;
            if (n1 < n2) return -1;
        }

        return 0;
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
