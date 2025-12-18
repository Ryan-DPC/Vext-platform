// Stick Fighting Arena - Socket Handler (Relay/Matchmaking Only)
// Manages matchmaking and relays events between players. Game logic is client-side.

const StickArenaStatsService = require('./stick-arena-stats.service');
const logger = require('../../utils/logger');

const rooms = new Map();
let waitingPlayers = new Map(); // playerId -> socket

// Debug mode
// const DEBUG_MODE = process.env.STICK_ARENA_DEBUG === 'true';

class GameRoom {
    constructor(player1Socket, player2Socket, player1Id, player2Id) {
        this.id = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.player1 = {
            socket: player1Socket,
            id: player1Id,
            score: 0
        };
        this.player2 = {
            socket: player2Socket,
            id: player2Id,
            score: 0
        };
        this.createdAt = Date.now();
        logger.info(`[Stick Arena] Room created: ${this.id} (${player1Id} vs ${player2Id})`);
    }

    getOpponent(socket) {
        return this.player1.socket === socket ? this.player2 : this.player1;
    }
}

const handleStickArena = (socket) => {
    if (DEBUG_MODE) logger.debug(`[Stick Arena] Socket connected: ${socket.id}`);

    // Join stick arena namespace
    socket.on('stick-arena:join', (data) => {
        const userId = data.userId || socket.id;
        socket.userId = userId;
        logger.info(`[Stick Arena] Player joined: ${userId}`);
        socket.emit('stick-arena:joined', { userId });
    });

    // Matchmaking
    socket.on('stick-arena:findMatch', (data) => {
        const userId = data.userId || socket.id;

        if (waitingPlayers.has(userId)) return;

        const waitingEntries = Array.from(waitingPlayers.entries());
        if (waitingEntries.length === 0) {
            waitingPlayers.set(userId, socket);
            socket.emit('stick-arena:waiting', { message: 'Waiting for opponent...' });
        } else {
            const [opponentId, opponentSocket] = waitingEntries[0];
            waitingPlayers.delete(opponentId);

            const room = new GameRoom(opponentSocket, socket, opponentId, userId);
            rooms.set(room.id, room);

            opponentSocket.join(room.id);
            socket.join(room.id);

            // Notify P1 (Opponent)
            opponentSocket.emit('stick-arena:matchFound', {
                roomId: room.id,
                playerId: 1, // Host/P1
                opponentId: userId,
                opponentSocket: socket.id
            });

            // Notify P2 (Current User)
            socket.emit('stick-arena:matchFound', {
                roomId: room.id,
                playerId: 2, // Client/P2
                opponentId: opponentId,
                opponentSocket: opponentSocket.id
            });
        }
    });

    // --- RELAY EVENT HANDLERS ---
    // These handlers just forward data to the opponent without processing it.

    // Player Movement/State
    socket.on('stick-arena:playerUpdate', (data) => {
        const room = findRoomBySocket(socket);
        if (room) {
            // Forward directly to opponent
            socket.to(room.id).emit('stick-arena:opponentMoved', {
                ...data.state,
                playerId: data.playerId
            });
        }
    });

    // Attacks
    socket.on('stick-arena:shoot', (data) => {
        const room = findRoomBySocket(socket);
        if (room) {
            socket.to(room.id).emit('stick-arena:projectileCreated', data.projectile);
        }
    });

    socket.on('stick-arena:melee', (data) => {
        const room = findRoomBySocket(socket);
        if (room) {
            socket.to(room.id).emit('stick-arena:playerMelee', data);
        }
    });

    // Damage / Health Sync
    socket.on('stick-arena:playerDamaged', (data) => {
        const room = findRoomBySocket(socket);
        if (room) {
            socket.to(room.id).emit('stick-arena:playerDamaged', data);
        }
    });

    // Items
    socket.on('stick-arena:powerupSpawned', (data) => {
        const room = findRoomBySocket(socket);
        if (room) {
            socket.to(room.id).emit('stick-arena:powerupSpawned', data.powerup);
        }
    });

    socket.on('stick-arena:powerupCollected', (data) => {
        const room = findRoomBySocket(socket);
        if (room) {
            socket.to(room.id).emit('stick-arena:powerupCollected', data);
        }
    });

    // Chat
    socket.on('stick-arena:chat', (data) => {
        const room = findRoomBySocket(socket);
        if (room) {
            socket.to(room.id).emit('stick-arena:chat', {
                senderId: socket.userId || 'Anonymous',
                message: data.message
            });
        }
    });

    // Round Logic (Trusting Clients for now)
    socket.on('stick-arena:roundEnd', async (data) => {
        const room = findRoomBySocket(socket);
        if (room) {
            // Prevent double counting if both clients send it? 
            // Simple approach: Both receive it, logic handles dedupe or we trust the sender.

            if (data.winnerId === 1) room.player1.score++;
            else if (data.winnerId === 2) room.player2.score++;

            // Broadcast result to ensure sync
            io.to(room.id).emit('stick-arena:roundEnd', {
                winnerId: data.winnerId,
                scores: {
                    player1: room.player1.score,
                    player2: room.player2.score
                }
            });

            // Async stats update
            if (room.player1.userId && room.player2.userId) { // Check if real users
                // Stats recording logic here...
            }
        }
    });

    // Cleanup
    socket.on('disconnect', () => {
        const userId = socket.userId || socket.id;
        waitingPlayers.delete(userId);
        handlePlayerLeave(socket);
    });

    socket.on('stick-arena:leaveMatch', () => handlePlayerLeave(socket));
};

function findRoomBySocket(socket) {
    for (const room of rooms.values()) {
        if (room.player1.socket === socket || room.player2.socket === socket) return room;
    }
    return null;
}

function handlePlayerLeave(socket) {
    const room = findRoomBySocket(socket);
    if (room) {
        const opponent = room.getOpponent(socket);
        opponent.socket.emit('stick-arena:opponentDisconnected', { message: 'Opponent disconnected' });

        socket.leave(room.id);
        opponent.socket.leave(room.id);
        rooms.delete(room.id);
        logger.info(`[Stick Arena] Room closed: ${room.id}`);
    }
}

module.exports = handleStickArena;
