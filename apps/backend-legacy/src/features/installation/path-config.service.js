const fs = require('fs').promises;
const path = require('path');
const UserSettings = require('./user-settings.model');

class PathConfigService {
    /**
     * Get user's installation path
     * @param {string} userId - User ID
     * @returns {Promise<string|null>} Install path or null if not set
     */
    async getInstallPath(userId) {
        const settings = await UserSettings.findOne({ user_id: userId });
        return settings?.install_path || null;
    }

    /**
     * Set user's installation path
     * @param {string} userId - User ID
     * @param {string} installPath - Path to set (e.g., "C:/Games")
     * @returns {Promise<string>} Full Ether path (e.g., "C:/Games/Ether")
     */
    async setInstallPath(userId, installPath) {
        // Skip validation in Docker (can't access Windows filesystem)
        // In Electron mode, the path is used directly on Windows

        // Save to database without validation
        await UserSettings.findOneAndUpdate(
            { user_id: userId },
            { install_path: installPath },
            { upsert: true, new: true }
        );

        return installPath;
    }

    /**
     * Validate that a path is writable and accessible
     * @param {string} dirPath - Path to validate
     * @throws {Error} If path is invalid
     */
    async validatePath(dirPath) {
        try {
            // Check if path exists
            const stats = await fs.stat(dirPath);
            if (!stats.isDirectory()) {
                throw new Error('Path is not a directory');
            }

            // Test write permissions by creating a temp file
            const testFile = path.join(dirPath, '.ether_test');
            await fs.writeFile(testFile, 'test');
            await fs.unlink(testFile);

            return true;
        } catch (error) {
            if (error.code === 'ENOENT') {
                throw new Error('Path does not exist');
            } else if (error.code === 'EACCES') {
                throw new Error('No write permission for this path');
            }
            throw new Error(`Invalid path: ${error.message}`);
        }
    }

    /**
     * Create the "Ether" directory inside the provided path
     * @param {string} basePath - Base path (e.g., "C:/Games")
     * @returns {Promise<string>} Full Ether path (e.g., "C:/Games/Ether")
     */
    async ensureEtherDirectory(basePath) {
        const etherPath = path.join(basePath, 'Ether');

        try {
            await fs.mkdir(etherPath, { recursive: true });
            console.log(`[PathConfig] Created Ether directory: ${etherPath}`);
            return etherPath;
        } catch (error) {
            throw new Error(`Failed to create Ether directory: ${error.message}`);
        }
    }

    /**
     * Get the full game path for a specific game
     * @param {string} userId - User ID
     * @param {string} folderName - Game folder name (e.g., "spludbuster")
     * @returns {Promise<string>} Full game path (e.g., "C:/Games/Ether/spludbuster")
     */
    async getGamePath(userId, folderName) {
        const installPath = await this.getInstallPath(userId);
        if (!installPath) {
            throw new Error('Install path not configured');
        }
        return path.join(installPath, folderName);
    }

    /**
     * Check if install path is configured for a user
     * @param {string} userId - User ID
     * @returns {Promise<boolean>}
     */
    async isPathConfigured(userId) {
        const installPath = await this.getInstallPath(userId);
        return !!installPath;
    }
}

module.exports = new PathConfigService();
