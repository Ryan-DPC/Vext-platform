const express = require('express');
const router = express.Router();
const LobbyController = require('./lobby.controller');
const auth = require('../../middleware/auth');

// --- Lobby Routes ---

// Créer un lobby
router.post('/create', LobbyController.createLobby);

// Rejoindre un lobby
router.post('/join', LobbyController.joinLobby);

// Quitter un lobby
router.post('/leave', LobbyController.leaveLobby);

// Récupérer les joueurs d'un lobby
router.get('/:lobbyId/players', LobbyController.getPlayers);

// Retirer un joueur d'un lobby
router.post('/remove-player', LobbyController.removePlayer);

// --- Game Session Routes ---

// Créer une session (Lancer un jeu)
router.post('/session/create', auth, LobbyController.createSession);

// Heartbeat
router.post('/session/heartbeat', LobbyController.heartbeat);

// Fin de session
router.post('/session/end', LobbyController.endSession);

// Obtenir la session active
router.get('/session/active', auth, LobbyController.getActiveSession);

module.exports = router;
