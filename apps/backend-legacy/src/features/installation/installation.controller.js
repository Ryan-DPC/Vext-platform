const installationService = require('./installation.service');
const pathConfigService = require('./path-config.service');
const versionService = require('./version.service');

class InstallationController {
    /**
     * Start game installation
     */
    async install(req, res) {
        try {
            const { gameId } = req.body;
            const userId = req.user.id;
            const io = req.app.get('io'); // Get Socket.io instance

            if (!gameId) {
                return res.status(400).json({ error: 'Game ID required' });
            }

            // Check if install path is configured BEFORE starting installation
            const isConfigured = await pathConfigService.isPathConfigured(userId);
            if (!isConfigured) {
                return res.status(400).json({
                    error: 'Install path not configured. Please set your installation directory first.',
                    requiresPathSetup: true
                });
            }

            // Start installation in background
            installationService.installGame(userId, gameId, io)
                .catch(error => {
                    console.error('[InstallationController] Background installation error:', error);
                });

            res.json({
                success: true,
                message: 'Installation started'
            });
        } catch (error) {
            console.error('[InstallationController] Install error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Start game update
     */
    async update(req, res) {
        try {
            const { gameId } = req.body;
            const userId = req.user.id;
            const io = req.app.get('io');

            if (!gameId) {
                return res.status(400).json({ error: 'Game ID required' });
            }

            // Start update in background
            installationService.updateGame(userId, gameId, io)
                .catch(error => {
                    console.error('[InstallationController] Background update error:', error);
                });

            res.json({
                success: true,
                message: 'Update started'
            });
        } catch (error) {
            console.error('[InstallationController] Update error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Cancel installation/update
     */
    async cancel(req, res) {
        try {
            const { gameId } = req.body;
            const userId = req.user.id;

            if (!gameId) {
                return res.status(400).json({ error: 'Game ID required' });
            }

            await installationService.cancelInstallation(userId, gameId);

            res.json({
                success: true,
                message: 'Installation cancelled'
            });
        } catch (error) {
            console.error('[InstallationController] Cancel error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Get installation status
     */
    async getStatus(req, res) {
        try {
            const { gameId } = req.params;
            const userId = req.user.id;

            const status = await installationService.getInstallStatus(userId, gameId);

            res.json({
                success: true,
                status
            });
        } catch (error) {
            console.error('[InstallationController] Get status error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Get user's install path
     */
    async getInstallPath(req, res) {
        try {
            const userId = req.user.id;
            const installPath = await pathConfigService.getInstallPath(userId);

            res.json({
                success: true,
                installPath
            });
        } catch (error) {
            console.error('[InstallationController] Get install path error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Set user's install path
     */
    async setInstallPath(req, res) {
        try {
            const { path } = req.body;
            const userId = req.user.id;

            if (!path) {
                return res.status(400).json({ error: 'Path required' });
            }

            const etherPath = await pathConfigService.setInstallPath(userId, path);

            res.json({
                success: true,
                installPath: etherPath,
                message: 'Install path configured successfully'
            });
        } catch (error) {
            console.error('[InstallationController] Set install path error:', error);
            res.status(400).json({ error: error.message });
        }
    }

    /**
     * Check for updates for all installed games
     */
    async checkUpdates(req, res) {
        try {
            const userId = req.user.id;
            const installations = await installationService.getUserInstalledGames(userId);
            const updates = [];

            for (const installation of installations) {
                if (!installation.game_id) continue;

                const gameId = installation.game_id._id || installation.game_id;
                const { required, currentVersion, latestVersion } = await versionService.isUpdateRequired(gameId, userId);

                if (required) {
                    updates.push({
                        gameId,
                        gameName: installation.game_id.game_name,
                        currentVersion,
                        latestVersion
                    });
                }

                // Update last checked timestamp
                await versionService.updateLastChecked(gameId, userId);
            }

            res.json({
                success: true,
                updates
            });
        } catch (error) {
            console.error('[InstallationController] Check updates error:', error);
            res.status(500).json({ error: error.message });
        }
    }
    /**
     * Update installation status (called by Electron app)
     */
    async updateStatus(req, res) {
        try {
            const { gameId, status, path } = req.body;
            const userId = req.user.id;

            if (!gameId || !status) {
                return res.status(400).json({ error: 'Game ID and status required' });
            }

            await installationService.updateInstallationStatus(userId, gameId, status, path);

            res.json({
                success: true,
                message: 'Status updated'
            });
        } catch (error) {
            console.error('[InstallationController] Update status error:', error);
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new InstallationController();
