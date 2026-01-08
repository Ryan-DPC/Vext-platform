import 'express-async-errors';
import express, { Application, Request, Response } from 'express';
import compression from 'compression';
import path from 'path';

// Config Imports
// @ts-ignore
import connectDB from './config/db';
// @ts-ignore
import { connectRedis } from './config/redis';
// @ts-ignore
import { connectDatabase, sequelize } from './config/database';

// Service Imports
// @ts-ignore
import CronService from './services/cron.service';
// @ts-ignore
import DefaultImageService from './services/defaultImage.service';
// @ts-ignore
import GamesService from './features/games/games.service';

// Middleware Imports
// @ts-ignore
import helmetMiddleware from './middleware/helmet';
// @ts-ignore
import corsMiddleware from './middleware/cors';
// @ts-ignore
import { generalLimiter, authLimiter } from './middleware/rateLimit';
// @ts-ignore
import sanitizerMiddleware from './middleware/sanitizer';
// @ts-ignore
import xssCleanMiddleware from './middleware/xssClean';
// @ts-ignore
import errorHandler from './utils/errorHandler';
// @ts-ignore
import requestLogger from './middleware/requestLogger';

// Route Imports
// @ts-ignore
import authRoutes from './features/auth/auth.routes';
// @ts-ignore
import usersRoutes from './features/users/users.routes';
// @ts-ignore
import gamesRoutes from './features/games/games.routes';
// @ts-ignore
import libraryRoutes from './features/library/library.routes';
// @ts-ignore
import friendsRoutes from './features/friends/friends.routes';
// @ts-ignore
import chatRoutes from './features/chat/chat.routes';
// @ts-ignore
import lobbyRoutes from './features/lobby/lobby.routes';
// @ts-ignore
import itemsRoutes from './features/items/items.routes';
// @ts-ignore
import adminRoutes from './features/admin/admin.routes';
// @ts-ignore
import devGamesRoutes from './features/dev-games/dev-games.routes';
// @ts-ignore
import gameCategoriesRoutes from './features/game-categories/game-categories.routes';
// @ts-ignore
import gameOwnershipRoutes from './features/game-ownership/game-ownership.routes';
// @ts-ignore
import installationRoutes from './features/installation/installation.routes';
// @ts-ignore
import stickArenaRoutes from './features/stick-arena/stick-arena.routes';
// @ts-ignore
import wsBridgeRoutes from './features/ws-bridge/ws-bridge.routes';
// @ts-ignore
import financeRoutes from './features/finance/finance.routes';
// @ts-ignore
import statsRoutes from './features/stats/stats.routes';

// Import Postgres Models
import './features/finance/transaction.model';
import './features/finance/invoice.model';

const app: Application = express();

// Trust Proxy
app.set('trust proxy', 1);

// Connect to Databases
connectDB();
connectRedis();
connectDatabase().then(async () => {
    if (process.env.NODE_ENV !== 'production') {
        await sequelize.sync({ alter: true });
        console.log('✅ PostgreSQL Models Synced');
    }
});

// Services
DefaultImageService.ensureDefaultImage();

// Pre-warm Cache
setTimeout(() => {
    console.log('🚀 Pre-warming Games Cache...');
    GamesService.getAllGames()
        .then(() => console.log('✅ Games Cache Warmed'))
        .catch((err: Error) => console.error('❌ Failed to warm games cache:', err.message));
}, 5000);

// Cron Jobs
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

// Static Files
app.use(express.static(path.join(__dirname, '../../me/stick fighting')));
app.use('/public', express.static(path.join(__dirname, '../public')));

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

// Socket.io Placeholder
app.use('/socket.io/', (req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        message: 'This backend does not support WebSockets. Please connect to the Central Server.'
    });
});

// Root Route
app.get('/', (req: Request, res: Response) => {
    res.status(200).json({
        success: true,
        message: 'Ether Backend API is running',
        version: '1.0.0'
    });
});

// Health Check
app.get('/api/health', (req: Request, res: Response) => {
    res.status(200).json({
        success: true,
        status: 'ok',
        timestamp: new Date(),
        uptime: process.uptime()
    });
});

// Legacy Ping
app.get('/api/ping', (req: Request, res: Response) => {
    res.status(200).json({ success: true, message: 'pong' });
});

// Error Handler
app.use(errorHandler);

export default app;
