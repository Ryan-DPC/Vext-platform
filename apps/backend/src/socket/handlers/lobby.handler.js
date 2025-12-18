const LobbyService = require('../../features/lobby/lobby.service');

module.exports = (socket) => {
    // Note: As a client, we emit events to central server which handles broadcasting

    // Créer un nouveau lobby
    socket.on('createGame', () => {
        if (!socket.data.name) {
            socket.emit('error', { message: 'You must set your name before creating a game.' });
            return;
        }

        const code = LobbyService.createLobby(socket.id);
        console.log(`Game created by ${socket.data.name} with code: ${code}`);

        // Emit to central server to handle
        socket.emit('gameCreated', { code, creator: socket.data.name, url: `/games/chessmulti/${code}` });
    });

    // Rejoindre un lobby
    socket.on('joinGame', (code) => {
        if (!socket.data.name) {
            socket.emit('error', { message: 'You must set your name before joining a game.' });
            return;
        }

        const success = LobbyService.joinLobby(code, socket.id);
        if (success) {
            let players = LobbyService.getPlayers(code);
            console.log(`Players in lobby ${code}:`, players);

            // Send to central server to broadcast
            socket.emit('joinLobby:broadcast', { code, player: socket.data.name, lobbyId: code });
        } else {
            socket.emit('error', { message: 'Lobby is full or does not exist.' });
        }
    });

    socket.on('joinLobby', ({ lobbyId }) => {
        console.log(`Socket ${socket.id} is trying to join lobby ${lobbyId}`);

        const success = LobbyService.joinLobby(lobbyId, socket.id);
        if (success) {
            const players = LobbyService.getPlayers(lobbyId);
            console.log(`Players in lobby ${lobbyId}:`, players);

            // Send to central server to broadcast
            socket.emit('playerList:broadcast', { lobbyId, players });
        } else {
            socket.emit('error', { message: 'Failed to join lobby. Lobby not found.' });
        }
    });

    // Quitter un lobby
    socket.on('leaveGame', (code) => {
        const lobby = LobbyService.leaveLobby(socket.id);
        console.log(`${socket.data.name} left game ${code}`);

        if (lobby) {
            let players = LobbyService.getPlayers(code);

            // Send to central server to broadcast
            socket.emit('playerLeft:broadcast', { code, player: socket.data.name, players });
        }
    });

    // Obtenir la liste des joueurs d'un lobby
    socket.on('requestPlayerList', (code) => {
        let players = LobbyService.getPlayers(code);
        if (!Array.isArray(players)) players = [];

        socket.emit('playerList', players);
    });

    // Lobby invite
    socket.on('lobby:invite', ({ friendId, lobbyId }) => {
        console.log(`[Socket] Lobby invite from ${socket.id} to friend ${friendId} for lobby ${lobbyId}`);

        // Forward to central server to handle
        socket.emit('lobby:invite:forward', {
            lobbyId,
            friendId,
            fromUserId: socket.id,
            fromUsername: socket.data.name || 'Unknown'
        });
    });

    // Listen for broadcasts from central server
    socket.on('playerJoined', (data) => {
        console.log('[Central Server] Player joined:', data);
    });

    socket.on('playerLeft', (data) => {
        console.log('[Central Server] Player left:', data);
    });

    // Déconnexion (nettoyage lobby)
    socket.on('disconnect', () => {
        const lobby = LobbyService.leaveLobby(socket.id);
        if (lobby) {
            let players = LobbyService.getPlayers(lobby);

            // Notify central server
            socket.emit('playerLeft:broadcast', {
                lobbyId: lobby,
                message: `${socket.data.name || 'A player'} has left the game.`,
                players
            });
        }
    });
};

