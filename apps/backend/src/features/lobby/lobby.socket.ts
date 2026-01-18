
import { WebSocketService } from '../../services/websocket.service';

// Simple in-memory lobby manager (Socket version)
// Note: This parallels the HTTP LobbyService but is focused on ephemeral socket rooms
class LobbySocketService {
    private lobbies: Map<string, any>;
    private socketToLobby: Map<string, string>;

    constructor() {
        this.lobbies = new Map();
        this.socketToLobby = new Map();
    }

    generateCode() {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    createLobby(socketId: string) {
        const code = this.generateCode();
        this.lobbies.set(code, {
            players: [socketId],
            createdAt: Date.now(),
        });
        this.socketToLobby.set(socketId, code);
        return code;
    }

    joinLobby(code: string, socketId: string) {
        const lobby = this.lobbies.get(code);
        if (lobby && lobby.players.length < 2) {
            lobby.players.push(socketId);
            this.socketToLobby.set(socketId, code);
            return true;
        }
        return false;
    }

    leaveLobby(socketId: string) {
        const code = this.socketToLobby.get(socketId);
        if (code) {
            const lobby = this.lobbies.get(code);
            if (lobby) {
                lobby.players = lobby.players.filter((id: string) => id !== socketId);
                if (lobby.players.length === 0) {
                    this.lobbies.delete(code);
                }
            }
            this.socketToLobby.delete(socketId);
            return code;
        }
        return null;
    }

    getPlayers(code: string) {
        const lobby = this.lobbies.get(code);
        return lobby ? lobby.players : [];
    }
}

export const lobbySocketService = new LobbySocketService();

export const handleLobbyMessage = async (ws: any, type: string, payload: any) => {
    switch (type) {
        case 'createGame':
            if (!ws.data.userId) { // require auth/username
                ws.send(JSON.stringify({ type: 'error', data: { message: 'Authentication required' } }));
                return;
            }
            const code = lobbySocketService.createLobby(ws.data.userId); // Store by userId instead of socketId for stability? No, socket logic uses connection ID for routing usually vs UserID.
            // But here we are in Elysia. ws.id is available? 
            // Elysia WS doesn't expose a stable UUID by default unless we assign one?
            // Actually, we can use userId as the key if unique per connection? No, multiple tabs.
            // Let's use ws.id (Elysia usually has it). If not, we generate one.
            const socketId = ws.data.id || ws.data.userId; // Fallback

            ws.subscribe(code);

            console.log(`[Lobby] Game created by ${ws.data.username} with code: ${code}`);

            ws.send(JSON.stringify({
                type: 'gameCreated',
                data: { code, creator: ws.data.username, url: `/games/chessmulti/${code}` }
            }));
            break;

        case 'joinGame':
            const joinCode = payload;
            const joinName = ws.data.username;
            if (!joinName) {
                ws.send(JSON.stringify({ type: 'error', data: { message: 'Authentication required' } }));
                return;
            }

            const sId = ws.data.id || ws.data.userId;
            const success = lobbySocketService.joinLobby(joinCode, sId);

            if (success) {
                ws.subscribe(joinCode);
                const players = lobbySocketService.getPlayers(joinCode);
                // We should resolve usernames... for now mock or use IDs
                const playerNames = players.map((p: string) => p.substring(0, 8));

                ws.publish(joinCode, JSON.stringify({
                    type: 'playerJoined',
                    data: { code: joinCode, player: joinName, players: playerNames }
                }));
                // Also send to self (publish doesn't send to sender in some implementations, but in Elysia it sends to subscribers)
                // Start game msg encoded here?
            } else {
                ws.send(JSON.stringify({ type: 'error', data: { message: 'Lobby is full or does not exist.' } }));
            }
            break;

        case 'leaveGame':
            handleLobbyDisconnect(ws);
            break;

        case 'lobby:invite':
            // Logic ported from apps/server
            const { userId, lobbyId } = payload;
            const fromUser = {
                id: ws.data.userId,
                username: ws.data.username
            };
            console.log(`[Lobby] Invite from ${fromUser.username} to ${userId}`);

            // Publish to target user's channel
            // Note: backend index.ts handles 'publish' logic manually via WebSocketService or direct ws.publish
            ws.publish(`user:${userId}`, JSON.stringify({
                type: 'lobby:invite-received',
                data: { lobbyId, fromUser, fromUserId: fromUser.id, fromUsername: fromUser.username } // Match frontend expectations
            }));
            break;
    }
}

export const handleLobbyDisconnect = (ws: any) => {
    const sId = ws.data.id || ws.data.userId;
    const lobby = lobbySocketService.leaveLobby(sId);
    if (lobby) {
        ws.unsubscribe(lobby);
        ws.publish(lobby, JSON.stringify({
            type: 'playerLeft',
            data: { code: lobby, player: ws.data.username, message: `${ws.data.username} has left.` }
        }));
    }
}
