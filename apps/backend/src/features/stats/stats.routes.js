const express = require('express');
const router = express.Router();
const StatsController = require('./stats.controller');
const authMiddleware = require('../../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

// Session Management
router.post('/session/start', StatsController.startSession);
router.post('/session/end', StatsController.endSession);

// Data Retrieval
router.get('/global', StatsController.getGlobalStats);
router.get('/:gameId', StatsController.getGameStats);

module.exports = router;
