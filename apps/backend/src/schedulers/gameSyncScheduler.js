const cron = require('node-cron');
const gameSyncService = require('../services/gameSyncService');

class GameSyncScheduler {
    constructor() {
        this.task = null;
    }

    /**
     * Start the hourly sync scheduler
     */
    start() {
        // Run every hour at :00
        this.task = cron.schedule('0 * * * *', async () => {
            console.log('\n🕐 Hourly game sync triggered');
            try {
                await gameSyncService.syncAllGames(false);
            } catch (error) {
                console.error('Scheduled sync failed:', error);
            }
        });

        console.log('✅ Game sync scheduler started (runs every hour)');

        // Optional: Run initial sync on startup
        this.runInitialSync();
    }

    /**
     * Run sync immediately on server start
     */
    async runInitialSync() {
        console.log('🚀 Running initial game sync...');
        setTimeout(async () => {
            try {
                await gameSyncService.syncAllGames(false);
            } catch (error) {
                console.error('Initial sync failed:', error);
            }
        }, 5000); // Wait 5 seconds after server start
    }

    /**
     * Stop the scheduler
     */
    stop() {
        if (this.task) {
            this.task.stop();
            console.log('Game sync scheduler stopped');
        }
    }
}

module.exports = new GameSyncScheduler();
