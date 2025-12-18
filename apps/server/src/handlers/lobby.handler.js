const Ajv = require("ajv");
const ajv = new Ajv();
const schema = require("../schemas/lobby.schema");
const validate = ajv.compile(schema);
const LobbyService = require('../services/lobby.service');

module.exports = (io, socket) => {
    // Keep existing LobbyService logic for create/join/leave as it seems to be working game logic
    // But ensure we add the new spec event `lobby:invite` with validation

    // ... Existing events ...
    socket.on('createGame', () => {
        if (!socket.data.name) {
            socket.emit('error', { message: 'You must set your name before creating a game.' });
            return;
        }
        const code = LobbyService.createLobby(socket.id);
        socket.join(code);
        console.log(`Game created by ${socket.data.name} with code: ${code}`);
        socket.emit('gameCreated', { code, creator: socket.data.name, url: `/games/chessmulti/${code}` });
    });

    socket.on('joinGame', (code) => {
        if (!socket.data.name) {
            socket.emit('error', { message: 'You must set your name before joining a game.' });
            return;
        }
        const success = LobbyService.joinLobby(code, socket.id);
        if (success) {
            socket.join(code);
            let players = LobbyService.getPlayers(code);
            const playerNames = players.map(id => io.sockets.sockets.get(id)?.data.name || `Player_${id}`);
            io.to(code).emit('playerJoined', { code, player: socket.data.name, players: playerNames });
        } else {
            socket.emit('error', { message: 'Lobby is full or does not exist.' });
        }
    });

    socket.on('leaveGame', (code) => {
        const lobby = LobbyService.leaveLobby(socket.id);
        socket.leave(code);
        if (lobby) {
            let players = LobbyService.getPlayers(code);
            const playerNames = players.map(id => io.sockets.sockets.get(id)?.data.name || `Player_${id}`);
            io.to(code).emit('playerLeft', { code, player: socket.data.name, players: playerNames });
        }
    });

    // New Spec Event: lobby:invite
    socket.on('lobby:invite', (payload) => {
        if (!validate(payload)) {
            return socket.emit("error", {
                code: "INVALID_PAYLOAD",
                message: "Invalid lobby:invite payload",
                errors: validate.errors
            });
        }

        const { userId, lobbyId } = payload;
        const fromUser = {
            id: socket.userId,
            username: socket.data.name || socket.username || 'Unknown'
        };

        console.log(`[lobby.handler] Invite from ${fromUser.id} to ${userId} for lobby ${lobbyId}`);

        io.to(`user:${userId}`).emit("lobby:invite-received", {
            lobbyId,
            fromUser
        });
    });

    socket.on('disconnect', () => {
        const lobby = LobbyService.leaveLobby(socket.id);
        if (lobby) {
            let players = LobbyService.getPlayers(lobby);
            const playerNames = players.map(id => io.sockets.sockets.get(id)?.data.name || `Player_${id}`);
            io.to(lobby).emit('playerLeft', { message: `${socket.data.name || 'A player'} has left the game.`, players: playerNames });
        }
    });
};
