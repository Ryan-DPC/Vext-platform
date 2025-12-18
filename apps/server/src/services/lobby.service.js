const Lobby = require('../models/lobby.model');

class LobbyService {
    static createLobby(socketId) {
        return Lobby.createLobby(socketId);
    }

    static joinLobby(lobbyId, socketId) {
        return Lobby.joinLobby(lobbyId, socketId);
    }

    static getPlayers(lobbyId) {
        return Lobby.getPlayers(lobbyId);
    }

    static leaveLobby(socketId) {
        return Lobby.leaveLobby(socketId);
    }
}

module.exports = LobbyService;
