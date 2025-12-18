require('express-async-errors');
const express = require('express');
const connectDB = require('./config/db');
const { connectRedis } = require('./config/redis');
const CronService = require('./services/cron.service');
const DefaultImageService = require('./services/defaultImage.service');
const compression = require('compression');
const { connectDatabase, sequelize } = require('./config/database');

// Import Postgres Models to ensure they are registered
require('./features/finance/transaction.model');
require('./features/finance/invoice.model');

// Middleware imports
const helmetMiddleware = require('./middleware/helmet');
const corsMiddleware = require('./middleware/cors');
const { generalLimiter, authLimiter } = require('./middleware/rateLimit');
const sanitizerMiddleware = require('./middleware/sanitizer');
const xssCleanMiddleware = require('./middleware/xssClean');
const errorHandler = require('./utils/errorHandler');
const requestLogger = require('./middleware/requestLogger');

// Route imports
const authRoutes = require('./features/auth/auth.routes');
const usersRoutes = require('./features/users/users.routes');
const gamesRoutes = require('./features/games/games.routes');
const libraryRoutes = require('./features/library/library.routes');
const friendsRoutes = require('./features/friends/friends.routes');
const chatRoutes = require('./features/chat/chat.routes');
const lobbyRoutes = require('./features/lobby/lobby.routes');
const itemsRoutes = require('./features/items/items.routes');
const adminRoutes = require('./features/admin/admin.routes');
const devGamesRoutes = require('./features/dev-games/dev-games.routes');
const gameCategoriesRoutes = require('./features/game-categories/game-categories.routes');
const gameOwnershipRoutes = require('./features/game-ownership/game-ownership.routes');
const installationRoutes = require('./features/installation/installation.routes');
const stickArenaRoutes = require('./features/stick-arena/stick-arena.routes');
const wsBridgeRoutes = require('./features/ws-bridge/ws-bridge.routes');
const financeRoutes = require('./features/finance/finance.routes');
const statsRoutes = require('./features/stats/stats.routes');

const app = express();

// Trust Proxy (Required for Render / Heroku / etc)
app.set('trust proxy', 1);

// Connect to Database
connectDB();

// Connect to Redis
connectRedis();

// Connect to PostgreSQL and Sync Models
connectDatabase().then(async () => {
    // Sync models - using alter: true to update tables if they exist but schema changed
    // In production, migrations are preferred over sync({alter: true})
    if (process.env.NODE_ENV !== 'production') {
        await sequelize.sync({ alter: true });
        console.log('✅ PostgreSQL Models Synced');
    }
});

// Ensure default game image exists on Cloudinary
DefaultImageService.ensureDefaultImage();

// Pre-warm Games Cache (Async)
const GamesService = require('./features/games/games.service');
setTimeout(() => {
    console.log('🚀 Pre-warming Games Cache...');
    GamesService.getAllGames()
        .then(() => console.log('✅ Games Cache Warmed'))
        .catch(err => console.error('❌ Failed to warm games cache:', err.message));
}, 5000); // Wait 5s for DB/Redis connections

// Start Cron Jobs
const cronService = new CronService();
cronService.start();

// Middleware
app.use(requestLogger);
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmetMiddleware);
app.use(corsMiddleware);
app.use(generalLimiter);
app.use(sanitizerMiddleware);
app.use(xssCleanMiddleware);

// Serve static files for stick fighting game
app.use(express.static(require('path').join(__dirname, '../../me/stick fighting')));

// Serve public files (e.g. game downloads)
app.use('/public', express.static(require('path').join(__dirname, '../public')));

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/games', gamesRoutes);
app.use('/api/library', libraryRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/lobby', lobbyRoutes);
app.use('/api/items', itemsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/dev-games', devGamesRoutes);
app.use('/api/game-categories', gameCategoriesRoutes);
app.use('/api/game-ownership', gameOwnershipRoutes);
app.use('/api/installation', installationRoutes);
app.use('/api/stick-arena', stickArenaRoutes);
app.use('/api/ws-bridge', wsBridgeRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/stats', statsRoutes);

// Explicitly handle /socket.io/ to prevent HTML 404s if frontend connects here by mistake
app.use('/socket.io/', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'This backend does not support WebSockets. Please connect to the Central Server.'
    });
});



// Root Route
app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Ether Backend API is running',
        version: '1.0.0'
    });
});

// Health Check
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        status: 'ok',
        timestamp: new Date(),
        uptime: process.uptime()
    });
});

// Legacy Ping (keep for backward compatibility if needed)
app.get('/api/ping', (req, res) => {
    res.status(200).json({ success: true, message: 'pong' });
});

// Error Handler
app.use(errorHandler);

module.exports = app;
