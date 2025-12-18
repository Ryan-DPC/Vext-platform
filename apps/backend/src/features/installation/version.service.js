const GameInstallation = require('./game-installation.model');
const Games = require('../games/games.model');

class VersionService {
    /**
     * Compare two semantic versions (e.g., "1.2.3" vs "1.3.0")
     * @param {string} version1 - First version
     * @param {string} version2 - Second version
     * @returns {number} -1 if v1 < v2, 0 if equal, 1 if v1 > v2
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
     * Check if an update is required for a game
     * @param {string} gameId - Game ID
     * @param {string} userId - User ID
     * @returns {Promise<{required: boolean, currentVersion: string, latestVersion: string}>}
     */
    async isUpdateRequired(gameId, userId) {
        const installation = await GameInstallation.findOne({ game_id: gameId, user_id: userId });
        if (!installation) {
            return { required: false, currentVersion: null, latestVersion: null };
        }

        const game = await Games.getGameById(gameId);
        if (!game || !game.manifestVersion) {
            return { required: false, currentVersion: installation.version, latestVersion: null };
        }

        const comparison = this.compareVersions(installation.version, game.manifestVersion);

        return {
            required: comparison < 0, // Local version is older
            currentVersion: installation.version,
            latestVersion: game.manifestVersion
        };
    }

    /**
     * Get latest manifest from Cloudinary (via Games model)
     * @param {string} gameId - Game ID
     * @returns {Promise<object|null>} Game manifest
     */
    async getLatestManifest(gameId) {
        const game = await Games.getGameById(gameId);
        if (!game || !game.manifestUrl) {
            return null;
        }

        try {
            const response = await fetch(game.manifestUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch manifest: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`[VersionService] Error fetching manifest for game ${gameId}:`, error);
            return null;
        }
    }

    /**
     * Update last checked timestamp for an installation
     * @param {string} gameId - Game ID
     * @param {string} userId - User ID
     */
    async updateLastChecked(gameId, userId) {
        await GameInstallation.findOneAndUpdate(
            { game_id: gameId, user_id: userId },
            { last_checked: new Date() }
        );
    }
}

module.exports = new VersionService();
