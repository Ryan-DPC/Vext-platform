const express = require('express');
const router = express.Router();
const verifyToken = require('../../middleware/auth');
const GameOwnershipController = require('./game-ownership.controller');

// All routes require authentication
router.use(verifyToken);

// Ownership routes
router.get('/my-games', GameOwnershipController.getMyGames);
router.post('/redeem-key', GameOwnershipController.redeemKey);
router.post('/install', GameOwnershipController.installGame);

// Marketplace routes
router.get('/marketplace', GameOwnershipController.getMarketplace);
router.post('/sell', GameOwnershipController.sellGame);
router.post('/cancel-sale', GameOwnershipController.cancelSale);

router.delete('/marketplace/:id', GameOwnershipController.deleteListing);
router.get('/my-sales', GameOwnershipController.getMySales);
router.get('/transactions', GameOwnershipController.getTransactions);
router.get('/stats/:gameKey', GameOwnershipController.getGameStats);

module.exports = router;
