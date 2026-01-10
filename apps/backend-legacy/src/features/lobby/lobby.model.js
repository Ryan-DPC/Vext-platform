class Lobby {
    constructor() {
        this.lobbies = {}; // Stockage temporaire des lobbys
    }

    // Créer un nouveau lobby
    createLobby(socketId) {
        const lobbyId = Math.random().toString(36).substring(2, 8); // Génère un code unique
        this.lobbies[lobbyId] = {
            players: [socketId],
            createdAt: Date.now(),
            timeout: null,
        };
        return lobbyId;
    }

    // Ajouter un joueur dans un lobby
    joinLobby(lobbyId, socketId) {
        if (this.lobbies[lobbyId]) {
            this.lobbies[lobbyId].players.push(socketId);
            return true;
        }
        return false;
    }

    leaveLobby(socketId) {
        for (const lobbyId in this.lobbies) {
            const lobby = this.lobbies[lobbyId];
            const index = lobby.players.indexOf(socketId);

            if (index !== -1) {
                lobby.players.splice(index, 1); // Retirer le joueur
                if (lobby.players.length === 0) {
                    delete this.lobbies[lobbyId]; // Supprimer le lobby si vide
                    console.log(`Lobby ${lobbyId} deleted as it became empty.`);
                }
                return lobbyId;
            }
        }
        return null; // Aucun lobby trouvé
    }

    // Récupérer les joueurs dans un lobby
    getPlayers(lobbyId) {
        return this.lobbies[lobbyId] || [];
    }

    // Retirer un joueur d'un lobby
    removePlayer(socketId) {
        for (const lobbyId in this.lobbies) {
            const lobby = this.lobbies[lobbyId];
            const index = lobby.players.indexOf(socketId);
            if (index !== -1) {
                lobby.players.splice(index, 1);
                if (lobby.players.length === 0) {
                    delete this.lobbies[lobbyId]; // Supprime le lobby s'il est vide
                }
                return lobbyId;
            }
        }
        return null;
    }

    getAllLobbies() {
        return this.lobbies;
    }

    // Vérifier si un lobby existe
    getLobby(lobbyId) {
        return this.lobbies[lobbyId] || null;
    }
}

module.exports = new Lobby();
