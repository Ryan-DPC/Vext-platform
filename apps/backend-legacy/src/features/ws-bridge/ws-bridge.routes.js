const express = require('express');
const router = express.Router();
const WsBridgeController = require('./ws-bridge.controller');

// --- User Registration ---
// Register a user with username, returns token
router.post('/register', WsBridgeController.register);

// --- Lobby Management ---
// Create a new lobby
router.post('/lobby', WsBridgeController.createLobby);

// Get lobby state by code
router.get('/lobby/:code', WsBridgeController.getLobby);

// Join an existing lobby
router.post('/lobby/join', WsBridgeController.joinLobby);

// Update lobby status
router.patch('/lobby/:code/status', WsBridgeController.updateStatus);

// --- Match Data ---
// Save match scores
router.post('/match/:lobbyId/score', WsBridgeController.saveScores);

module.exports = router;
