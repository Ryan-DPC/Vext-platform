class Lobby {
    constructor() {
        this.lobbies = new Map(); // Map<lobbyId, Set<socketId>>
        this.socketToLobby = new Map(); // Map<socketId, lobbyId>
    }

    createLobby(socketId) {
        const lobbyId = Math.random().toString(36).substring(2, 8).toUpperCase();
        this.lobbies.set(lobbyId, new Set([socketId]));
        this.socketToLobby.set(socketId, lobbyId);
        return lobbyId;
    }

    joinLobby(lobbyId, socketId) {
        if (this.lobbies.has(lobbyId)) {
            const lobby = this.lobbies.get(lobbyId);
            if (lobby.size < 2) { // Limite à 2 joueurs pour l'instant (ex: échecs)
                lobby.add(socketId);
                this.socketToLobby.set(socketId, lobbyId);
                return true;
            }
        }
        return false;
    }

    leaveLobby(socketId) {
        const lobbyId = this.socketToLobby.get(socketId);
        if (lobbyId) {
            const lobby = this.lobbies.get(lobbyId);
            if (lobby) {
                lobby.delete(socketId);
                if (lobby.size === 0) {
                    this.lobbies.delete(lobbyId);
                }
            }
            this.socketToLobby.delete(socketId);
            return lobbyId;
        }
        return null;
    }

    getPlayers(lobbyId) {
        if (this.lobbies.has(lobbyId)) {
            return Array.from(this.lobbies.get(lobbyId));
        }
        return [];
    }

    getLobby(lobbyId) {
        return this.lobbies.get(lobbyId);
    }

    getAllLobbies() {
        return Array.from(this.lobbies.keys());
    }
}

// Singleton instance
const lobbyInstance = new Lobby();
module.exports = lobbyInstance;
