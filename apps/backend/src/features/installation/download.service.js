const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

class DownloadService {
    constructor() {
        this.activeDownloads = new Map(); // gameId -> download state
    }

    /**
     * Download a file from URL with progress tracking
     * @param {string} url - File URL
     * @param {string} destPath - Destination file path
     * @param {string} userId - User ID for WebSocket
     * @param {string} gameId - Game ID for tracking
     * @param {object} io - Socket.io instance
     * @returns {Promise<void>}
     */
    async downloadFile(url, destPath, userId, gameId, io) {
        return new Promise((resolve, reject) => {
            const protocol = url.startsWith('https') ? https : http;
            const startTime = Date.now();

            // Ensure destination directory exists
            const destDir = path.dirname(destPath);
            if (!fs.existsSync(destDir)) {
                fs.mkdirSync(destDir, { recursive: true });
            }

            const file = fs.createWriteStream(destPath);
            let downloadedBytes = 0;
            let totalBytes = 0;
            let lastEmitTime = Date.now();

            const request = protocol.get(url, (response) => {
                if (response.statusCode !== 200) {
                    reject(new Error(`Download failed: HTTP ${response.statusCode}`));
                    return;
                }

                totalBytes = parseInt(response.headers['content-length'], 10) || 0;

                // Store download state
                this.activeDownloads.set(gameId, {
                    userId,
                    totalBytes,
                    downloadedBytes: 0,
                    startTime,
                    paused: false
                });

                response.on('data', (chunk) => {
                    downloadedBytes += chunk.length;
                    const state = this.activeDownloads.get(gameId);
                    if (state) {
                        state.downloadedBytes = downloadedBytes;
                    }

                    // Emit progress event (throttled to every 500ms)
                    const now = Date.now();
                    if (now - lastEmitTime >= 500) {
                        this.emitProgress(io, userId, gameId, downloadedBytes, totalBytes, startTime);
                        lastEmitTime = now;
                    }
                });

                response.pipe(file);

                file.on('finish', () => {
                    file.close();
                    this.activeDownloads.delete(gameId);

                    // Emit final progress
                    this.emitProgress(io, userId, gameId, downloadedBytes, totalBytes, startTime, true);

                    console.log(`[Download] Completed: ${path.basename(destPath)} (${this.formatBytes(downloadedBytes)})`);
                    resolve();
                });
            });

            request.on('error', (error) => {
                fs.unlink(destPath, () => { }); // Delete partial file
                this.activeDownloads.delete(gameId);
                reject(error);
            });

            file.on('error', (error) => {
                fs.unlink(destPath, () => { });
                this.activeDownloads.delete(gameId);
                reject(error);
            });
        });
    }

    /**
     * Emit progress via WebSocket
     */
    emitProgress(io, userId, gameId, downloadedBytes, totalBytes, startTime, isComplete = false) {
        const progress = totalBytes > 0 ? (downloadedBytes / totalBytes) * 100 : 0;
        const elapsedSeconds = (Date.now() - startTime) / 1000;
        const speed = elapsedSeconds > 0 ? downloadedBytes / elapsedSeconds : 0;
        const remainingBytes = totalBytes - downloadedBytes;
        const etaSeconds = speed > 0 ? remainingBytes / speed : 0;

        const progressData = {
            gameId,
            type: 'download',
            progress: Math.min(progress, 100).toFixed(1),
            speed: this.formatSpeed(speed),
            downloaded: this.formatBytes(downloadedBytes),
            total: this.formatBytes(totalBytes),
            eta: this.formatETA(etaSeconds),
            isComplete
        };

        // Emit to specific user
        io.to(userId).emit('installation:progress', progressData);
    }

    /**
     * Calculate download speed
     * @param {number} bytesDownloaded - Bytes downloaded
     * @param {number} elapsedTime - Elapsed time in seconds
     * @returns {number} Speed in bytes per second
     */
    calculateSpeed(bytesDownloaded, elapsedTime) {
        return elapsedTime > 0 ? bytesDownloaded / elapsedTime : 0;
    }

    /**
     * Estimate time remaining
     * @param {number} downloadedBytes - Bytes downloaded
     * @param {number} totalBytes - Total bytes
     * @param {number} speed - Speed in bytes per second
     * @returns {number} Estimated seconds remaining
     */
    estimateTimeRemaining(downloadedBytes, totalBytes, speed) {
        if (speed === 0) return 0;
        const remainingBytes = totalBytes - downloadedBytes;
        return remainingBytes / speed;
    }

    /**
     * Format bytes to human-readable string
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
    }

    /**
     * Format speed to human-readable string
     */
    formatSpeed(bytesPerSecond) {
        return `${this.formatBytes(bytesPerSecond)}/s`;
    }

    /**
     * Format ETA to human-readable string
     */
    formatETA(seconds) {
        if (seconds === 0 || !isFinite(seconds)) return 'Calculating...';
        if (seconds < 60) return `${Math.round(seconds)}s`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
        return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
    }

    /**
     * Cancel an active download
     */
    cancelDownload(gameId) {
        this.activeDownloads.delete(gameId);
        // Note: Actual request cancellation would require storing the request object
    }

    /**
     * Get download status
     */
    getDownloadStatus(gameId) {
        return this.activeDownloads.get(gameId) || null;
    }
}

module.exports = new DownloadService();
