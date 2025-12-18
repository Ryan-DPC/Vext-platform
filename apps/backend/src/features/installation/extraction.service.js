const fs = require('fs').promises;
const path = require('path');
const unzipper = require('unzipper');
const { createReadStream } = require('fs');

class ExtractionService {
    /**
     * Extract a ZIP file to destination with progress tracking
     * @param {string} zipPath - Path to ZIP file
     * @param {string} destPath - Destination directory
     * @param {string} userId - User ID for WebSocket
     * @param {string} gameId - Game ID for tracking
     * @param {object} io - Socket.io instance
     * @returns {Promise<void>}
     */
    async extractZip(zipPath, destPath, userId, gameId, io) {
        try {
            console.log(`[Extraction] Starting extraction: ${zipPath} -> ${destPath}`);

            // Ensure destination exists
            await fs.mkdir(destPath, { recursive: true });

            // Get ZIP file stats to estimate progress
            const stats = await fs.stat(zipPath);
            const totalSize = stats.size;
            let extractedSize = 0;

            return new Promise((resolve, reject) => {
                const stream = createReadStream(zipPath)
                    .pipe(unzipper.Parse());

                stream.on('entry', async (entry) => {
                    const fileName = entry.path;
                    const type = entry.type; // 'Directory' or 'File'
                    const size = entry.vars.uncompressedSize;

                    if (type === 'Directory') {
                        entry.autodrain();
                        return;
                    }

                    // Write file
                    const fullPath = path.join(destPath, fileName);
                    const fileDir = path.dirname(fullPath);

                    try {
                        await fs.mkdir(fileDir, { recursive: true });
                        entry.pipe(require('fs').createWriteStream(fullPath));

                        entry.on('finish', () => {
                            extractedSize += size;
                            const progress = (extractedSize / totalSize) * 100;

                            // Emit progress
                            io.to(userId).emit('installation:progress', {
                                gameId,
                                type: 'extract',
                                progress: Math.min(progress, 100).toFixed(1),
                                fileName,
                                isComplete: false
                            });
                        });
                    } catch (error) {
                        console.error(`[Extraction] Error writing file ${fileName}:`, error);
                        entry.autodrain();
                    }
                });

                stream.on('finish', async () => {
                    // Emit completion
                    io.to(userId).emit('installation:progress', {
                        gameId,
                        type: 'extract',
                        progress: 100,
                        isComplete: true
                    });

                    console.log(`[Extraction] Completed: ${destPath}`);

                    // Clean up ZIP file
                    try {
                        await fs.unlink(zipPath);
                        console.log(`[Extraction] Deleted ZIP file: ${zipPath}`);
                    } catch (err) {
                        console.warn(`[Extraction] Could not delete ZIP file:`, err);
                    }

                    resolve();
                });

                stream.on('error', (error) => {
                    console.error(`[Extraction] Error:`, error);
                    reject(error);
                });
            });
        } catch (error) {
            console.error(`[Extraction] Failed to extract ${zipPath}:`, error);
            throw error;
        }
    }

    /**
     * Validate extraction by checking for expected files
     * @param {string} destPath - Destination path
     * @param {object} manifest - Game manifest
     * @returns {Promise<boolean>}
     */
    async validateExtraction(destPath, manifest) {
        try {
            // Check if directory exists
            const stats = await fs.stat(destPath);
            if (!stats.isDirectory()) {
                return false;
            }

            // Check for entry point (if specified in manifest)
            if (manifest.entryPoint) {
                const entryPointPath = path.join(destPath, manifest.entryPoint);
                await fs.access(entryPointPath);
            }

            return true;
        } catch (error) {
            console.error(`[Extraction] Validation failed:`, error);
            return false;
        }
    }

    /**
     * Clean up a directory (for failed installations or updates)
     * @param {string} dirPath - Directory to clean
     */
    async cleanup(dirPath) {
        try {
            await fs.rm(dirPath, { recursive: true, force: true });
            console.log(`[Extraction] Cleaned up directory: ${dirPath}`);
        } catch (error) {
            console.warn(`[Extraction] Could not clean up ${dirPath}:`, error);
        }
    }
}

module.exports = new ExtractionService();
