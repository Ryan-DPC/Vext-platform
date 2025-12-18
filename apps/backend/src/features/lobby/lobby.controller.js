const LobbyService = require('./lobby.service');

class LobbyController {
    // --- Lobby Management ---

    // Créer un nouveau lobby
    static createLobby(req, res) {
        const { socketId } = req.body;
        if (!socketId) {
            return res.status(400).json({ message: 'Socket ID is required' });
        }

        const lobbyId = LobbyService.createLobby(socketId);
        res.status(201).json({ message: 'Lobby created', lobbyId });
    }

    // Ajouter un joueur dans un lobby
    static joinLobby(req, res) {
        const { lobbyId, socketId } = req.body;
        if (!lobbyId || !socketId) {
            return res.status(400).json({ message: 'Lobby ID and Socket ID are required' });
        }

        const success = LobbyService.joinLobby(lobbyId, socketId);
        if (success) {
            res.status(200).json({ message: 'Player joined the lobby' });
        } else {
            res.status(404).json({ message: 'Lobby not found' });
        }
    }

    static leaveLobby(req, res) {
        const { socketId } = req.body;

        if (!socketId) {
            return res.status(400).json({ message: 'Socket ID is required' });
        }

        const lobbyId = LobbyService.leaveLobby(socketId);

        if (lobbyId) {
            res.status(200).json({ message: 'Player left the lobby', lobbyId });
        } else {
            res.status(404).json({ message: 'Player not found in any lobby' });
        }
    }

    // Récupérer les joueurs d'un lobby
    static getPlayers(req, res) {
        const { lobbyId } = req.params;
        const players = LobbyService.getPlayers(lobbyId);
        res.status(200).json(players);
    }

    // Retirer un joueur d'un lobby
    static removePlayer(req, res) {
        const { socketId } = req.body;
        if (!socketId) {
            return res.status(400).json({ message: 'Socket ID is required' });
        }

        const lobbyId = LobbyService.removePlayer(socketId);
        res.status(200).json({ message: 'Player removed', lobbyId });
    }

    // --- Game Session Management ---

    // Créer une session de jeu
    static async createSession(req, res) {
        try {
            const userId = req.user.id;
            const { gameId, gameFolderName, ownershipToken } = req.body;

            if (!gameFolderName || !ownershipToken) {
                return res.status(400).json({ success: false, message: 'Données manquantes (gameFolderName, ownershipToken)' });
            }

            const session = await LobbyService.createSession(userId, gameId, gameFolderName, ownershipToken);
            res.status(201).json({ success: true, session });
        } catch (error) {
            console.error('Erreur lors de la création de session:', error);
            res.status(400).json({ success: false, message: error.message });
        }
    }

    // Heartbeat de session
    static async heartbeat(req, res) {
        try {
            const { sessionToken } = req.body;
            if (!sessionToken) {
                return res.status(400).json({ success: false, message: 'Token de session requis' });
            }

            const success = await LobbyService.updateHeartbeat(sessionToken);
            res.json({ success });
        } catch (error) {
            console.error('Erreur heartbeat:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // Fin de session
    static async endSession(req, res) {
        try {
            const { sessionToken } = req.body;
            if (!sessionToken) {
                return res.status(400).json({ success: false, message: 'Token de session requis' });
            }

            const success = await LobbyService.endSession(sessionToken);
            res.json({ success });
        } catch (error) {
            console.error('Erreur fin de session:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // Obtenir la session active
    static async getActiveSession(req, res) {
        try {
            const userId = req.user.id;
            const session = await LobbyService.getActiveSession(userId);
            res.json({ success: true, session });
        } catch (error) {
            console.error('Erreur récupération session active:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }
}

module.exports = LobbyController;
