const express = require('express');
const router = express.Router();
const installationController = require('./installation.controller');
const authMiddleware = require('../../middleware/auth');

// Installation operations
router.post('/install', authMiddleware, installationController.install);
router.post('/update', authMiddleware, installationController.update);
router.post('/cancel', authMiddleware, installationController.cancel);

// Status and information
router.post('/status', authMiddleware, installationController.updateStatus);
router.get('/status/:gameId', authMiddleware, installationController.getStatus);
router.get('/check-updates', authMiddleware, installationController.checkUpdates);

// Path configuration
router.get('/path', authMiddleware, installationController.getInstallPath);
router.post('/path', authMiddleware, installationController.setInstallPath);

module.exports = router;
