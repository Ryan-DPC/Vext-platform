const fs = require('fs').promises;
const path = require('path');
const archiver = require('archiver');
const crypto = require('crypto');
const cloudinary = require('cloudinary').v2;

class GameSyncService {
    constructor() {
        // Check if running in Docker (/usr/src/me) or locally
        const isDocker = require('fs').existsSync('/usr/src/me');
        this.devGamesPath = isDocker
            ? '/usr/src/me'
            : path.join(__dirname, '../../../me');
        this.slugFile = path.join(this.devGamesPath, 'slug.json');
        this.syncCache = new Map(); // Store last sync state
    }

    /**
     * Calculate checksum of a file
     */
    async calculateChecksum(filePath) {
        const fileBuffer = await fs.readFile(filePath);
        return crypto.createHash('sha256').update(fileBuffer).digest('hex');
    }

    /**
     * Calculate checksum of directory (all files)
     */
    async calculateDirChecksum(dirPath) {
        const files = await this.getAllFiles(dirPath);
        const checksums = await Promise.all(
            files.map(file => this.calculateChecksum(file))
        );
        return crypto.createHash('sha256').update(checksums.join('')).digest('hex');
    }

    /**
     * Get all files in directory recursively
     */
    async getAllFiles(dirPath, arrayOfFiles = []) {
        const files = await fs.readdir(dirPath);

        for (const file of files) {
            const filePath = path.join(dirPath, file);
            const stat = await fs.stat(filePath);

            if (stat.isDirectory()) {
                // Skip node_modules and other build directories
                if (!['node_modules', '.git', 'dist', 'build'].includes(file)) {
                    await this.getAllFiles(filePath, arrayOfFiles);
                }
            } else {
                arrayOfFiles.push(filePath);
            }
        }

        return arrayOfFiles;
    }

    /**
     * Read slug.json to get list of dev games
     */
    async getDevGames() {
        try {
            const slugData = await fs.readFile(this.slugFile, 'utf8');
            const data = JSON.parse(slugData);
            return data.games || {};
        } catch (error) {
            console.error('Error reading slug.json:', error);
            return {};
        }
    }

    /**
     * Check if game needs sync (manifest or files changed)
     */
    async needsSync(gameSlug, gamePath) {
        try {
            const manifestPath = path.join(gamePath, 'manifest.json');
            const manifestExists = await fs.access(manifestPath).then(() => true).catch(() => false);

            if (!manifestExists) {
                console.log(`No manifest found for ${gameSlug}, skipping`);
                return false;
            }

            // Calculate checksums
            const manifestChecksum = await this.calculateChecksum(manifestPath);
            const dirChecksum = await this.calculateDirChecksum(gamePath);
            const combinedChecksum = crypto.createHash('sha256')
                .update(manifestChecksum + dirChecksum)
                .digest('hex');

            // Check cache
            const cached = this.syncCache.get(gameSlug);
            if (cached && cached.checksum === combinedChecksum) {
                console.log(`${gameSlug}: No changes detected`);
                return false;
            }

            // Update cache
            this.syncCache.set(gameSlug, {
                checksum: combinedChecksum,
                lastSync: new Date()
            });

            return true;
        } catch (error) {
            console.error(`Error checking sync for ${gameSlug}:`, error);
            return false;
        }
    }

    /**
     * Create ZIP archive of game directory
     */
    async zipGame(gamePath, outputPath) {
        return new Promise((resolve, reject) => {
            const output = require('fs').createWriteStream(outputPath);
            const archive = archiver('zip', { zlib: { level: 9 } });

            output.on('close', () => {
                console.log(`Archive created: ${archive.pointer()} bytes`);
                resolve(outputPath);
            });

            archive.on('error', reject);
            archive.pipe(output);

            // Add all files except node_modules, etc.
            archive.glob('**/*', {
                cwd: gamePath,
                ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**', '*.log']
            });

            archive.finalize();
        });
    }

    /**
     * Find game logo/image in game directory
     */
    async findGameImage(gamePath) {
        const possibleNames = ['logo.png', 'game.png', 'icon.png', 'cover.png', 'image.png'];

        for (const name of possibleNames) {
            const imagePath = path.join(gamePath, name);
            const exists = await fs.access(imagePath).then(() => true).catch(() => false);
            if (exists) {
                return { path: imagePath, name };
            }
        }

        return null;
    }

    /**
     * Upload file to Cloudinary in organized folder
     */
    async uploadFileToCloudinary(filePath, publicId, resourceType = 'raw') {
        try {
            const result = await cloudinary.uploader.upload(filePath, {
                resource_type: resourceType,
                public_id: publicId,
                overwrite: true
            });
            console.log(`  ✓ Uploaded: ${publicId}`);
            return result;
        } catch (error) {
            console.error(`  ✗ Failed to upload ${publicId}:`, error.message);
            throw error;
        }
    }

    /**
     * Sync a single game - uploads manifest, image, and zip
     */
    async syncGame(gameSlug, gamePath) {
        try {
            console.log(`\n========== Syncing: ${gameSlug} ==========`);

            // Check if sync needed
            if (!await this.needsSync(gameSlug, gamePath)) {
                return { success: true, skipped: true, game: gameSlug };
            }

            const manifestPath = path.join(gamePath, 'manifest.json');
            const results = {
                success: true,
                game: gameSlug,
                manifest: null,
                image: null,
                zip: null,
                timestamp: new Date()
            };

            // 1. Upload manifest.json
            console.log(`Uploading manifest for ${gameSlug}...`);
            try {
                const manifestResult = await this.uploadFileToCloudinary(
                    manifestPath,
                    `games/dev/${gameSlug}/manifest`,
                    'raw'
                );
                results.manifest = manifestResult.secure_url;
            } catch (error) {
                console.error(`Failed to upload manifest for ${gameSlug}`);
                throw error;
            }

            // 2. Find and upload game image (logo.png, etc.)
            const gameImage = await this.findGameImage(gamePath);
            if (gameImage) {
                console.log(`Uploading image (${gameImage.name}) for ${gameSlug}...`);
                try {
                    const imageResult = await this.uploadFileToCloudinary(
                        gameImage.path,
                        `games/dev/${gameSlug}/image`,
                        'image'
                    );
                    results.image = imageResult.secure_url;
                } catch (error) {
                    console.warn(`Failed to upload image for ${gameSlug}, continuing...`);
                }
            } else {
                console.log(`No game image found for ${gameSlug}`);
            }

            // 3. Create and upload ZIP
            console.log(`Zipping ${gameSlug}...`);
            const tempDir = path.join(__dirname, '../../../temp');
            await fs.mkdir(tempDir, { recursive: true });
            const zipPath = path.join(tempDir, `${gameSlug}.zip`);

            await this.zipGame(gamePath, zipPath);

            console.log(`Uploading ZIP for ${gameSlug}...`);
            const zipResult = await this.uploadFileToCloudinary(
                zipPath,
                `games/dev/${gameSlug}/${gameSlug}`,
                'raw'
            );
            results.zip = zipResult.secure_url;
            results.size = zipResult.bytes;

            // Clean up temp file
            await fs.unlink(zipPath);

            console.log(`✅ ${gameSlug} synced successfully!`);
            console.log(`   Manifest: ${results.manifest}`);
            console.log(`   Image: ${results.image || 'N/A'}`);
            console.log(`   ZIP: ${results.zip}`);

            return results;
        } catch (error) {
            console.error(`❌ Failed to sync ${gameSlug}:`, error);
            return {
                success: false,
                game: gameSlug,
                error: error.message
            };
        }
    }

    /**
     * Sync all dev games
     */
    async syncAllGames(force = false) {
        try {
            console.log('\n========================================');
            console.log('Starting Dev Games Sync');
            console.log('========================================\n');

            if (force) {
                console.log('🔄 FORCE SYNC: Clearing cache...');
                this.syncCache.clear();
            }

            const devGames = await this.getDevGames();
            const results = [];

            for (const [slug, gameInfo] of Object.entries(devGames)) {
                const gamePath = path.join(this.devGamesPath, slug);

                // Check if directory exists (case-insensitive)
                const dirs = await fs.readdir(this.devGamesPath);
                const actualDir = dirs.find(d => d.toLowerCase() === slug.toLowerCase());

                if (!actualDir) {
                    console.log(`⚠️ Directory not found for ${slug}`);
                    results.push({ success: false, game: slug, error: 'Directory not found' });
                    continue;
                }

                const actualPath = path.join(this.devGamesPath, actualDir);
                const result = await this.syncGame(slug, actualPath);
                results.push(result);
            }

            console.log('\n========================================');
            console.log('Sync Complete!');
            console.log(`Synced: ${results.filter(r => r.success && !r.skipped).length}`);
            console.log(`Skipped: ${results.filter(r => r.skipped).length}`);
            console.log(`Failed: ${results.filter(r => !r.success).length}`);
            console.log('========================================\n');

            return {
                success: true,
                results,
                timestamp: new Date()
            };
        } catch (error) {
            console.error('Sync failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = new GameSyncService();
