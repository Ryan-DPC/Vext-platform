const { v4: uuidv4 } = require('uuid');
const PersistentLobby = require('./persistentLobby.model');

class WsBridgeService {
    /**
     * Register a user with a username and return a token
     * @param {string} username - The username to register
     * @returns {Promise<{token: string, userId: string, username: string}>}
     */
    static async registerUser(username) {
        if (!username || typeof username !== 'string' || username.trim().length < 2) {
            throw new Error('Username must be at least 2 characters long');
        }

        // Sanitize username
        const sanitizedUsername = username.trim().substring(0, 20);

        // Generate a unique token for this session
        const token = uuidv4();
        const userId = uuidv4(); // Simple userId for now, not tied to auth system

        return {
            token,
            userId,
            username: sanitizedUsername
        };
    }

    /**
     * Create a new lobby
     * @param {string} username - The username of the creator
     * @returns {Promise<{code: string, lobbyId: string}>}
     */
    static async createLobby(username) {
        if (!username) {
            throw new Error('Username is required to create a lobby');
        }

        // Generate a unique 6-character code
        let code;
        let attempts = 0;
        const maxAttempts = 10;

        while (attempts < maxAttempts) {
            code = this.generateLobbyCode();
            const existing = await PersistentLobby.findOne({ code });
            if (!existing) break;
            attempts++;
        }

        if (attempts === maxAttempts) {
            throw new Error('Failed to generate unique lobby code');
        }

        const lobby = await PersistentLobby.create({
            code,
            createdBy: username,
            players: [],
            status: 'waiting'
        });

        return {
            code: lobby.code,
            lobbyId: lobby._id.toString()
        };
    }

    /**
     * Get lobby state by code
     * @param {string} code - The 6-character lobby code
     * @returns {Promise<object>}
     */
    static async getLobbyByCode(code) {
        if (!code || code.length !== 6) {
            throw new Error('Invalid lobby code');
        }

        const lobby = await PersistentLobby.findOne({
            code: code.toUpperCase()
        });

        if (!lobby) {
            throw new Error('Lobby not found');
        }

        return {
            code: lobby.code,
            lobbyId: lobby._id.toString(),
            players: lobby.players.map(p => ({
                username: p.username,
                joinedAt: p.joinedAt
            })),
            status: lobby.status,
            maxPlayers: lobby.maxPlayers,
            createdBy: lobby.createdBy,
            createdAt: lobby.created_at
        };
    }

    /**
     * Join a lobby
     * @param {string} lobbyId - The lobby code
     * @param {string} username - The username joining
     * @returns {Promise<{success: boolean, lobbyId: string}>}
     */
    static async joinLobby(lobbyId, username) {
        if (!lobbyId || !username) {
            throw new Error('Lobby code and username are required');
        }

        const lobby = await PersistentLobby.findOne({
            code: lobbyId.toUpperCase()
        });

        if (!lobby) {
            throw new Error('Lobby not found');
        }

        if (lobby.status !== 'waiting') {
            throw new Error('Lobby is not accepting new players');
        }

        if (lobby.players.length >= lobby.maxPlayers) {
            throw new Error('Lobby is full');
        }

        // Check if username already in lobby
        const existingPlayer = lobby.players.find(p => p.username === username);
        if (existingPlayer) {
            throw new Error('Username already in this lobby');
        }

        // Generate token for this player
        const token = uuidv4();

        lobby.players.push({
            username,
            token,
            joinedAt: new Date()
        });

        await lobby.save();

        return {
            success: true,
            lobbyId: lobby.code,
            token
        };
    }

    /**
     * Save match scores
     * @param {string} lobbyId - The lobby code
     * @param {Array<{username: string, score: number}>} scores - Array of player scores
     * @returns {Promise<{success: boolean}>}
     */
    static async saveMatchScores(lobbyId, scores) {
        if (!lobbyId) {
            throw new Error('Lobby code is required');
        }

        if (!Array.isArray(scores) || scores.length === 0) {
            throw new Error('Scores must be a non-empty array');
        }

        const lobby = await PersistentLobby.findOne({
            code: lobbyId.toUpperCase()
        });

        if (!lobby) {
            throw new Error('Lobby not found');
        }

        // Add scores to matchScores array
        scores.forEach(({ username, score }) => {
            if (username && typeof score === 'number') {
                lobby.matchScores.push({
                    username,
                    score,
                    timestamp: new Date()
                });
            }
        });

        // Update lobby status to finished
        lobby.status = 'finished';
        await lobby.save();

        return {
            success: true,
            message: 'Match scores saved successfully'
        };
    }

    /**
     * Generate a random 6-character lobby code
     * @returns {string}
     */
    static generateLobbyCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    /**
     * Update lobby status
     * @param {string} lobbyId - The lobby code
     * @param {string} status - New status ('waiting', 'in-game', 'finished')
     * @returns {Promise<{success: boolean}>}
     */
    static async updateLobbyStatus(lobbyId, status) {
        const validStatuses = ['waiting', 'in-game', 'finished'];
        if (!validStatuses.includes(status)) {
            throw new Error('Invalid status');
        }

        const lobby = await PersistentLobby.findOne({
            code: lobbyId.toUpperCase()
        });

        if (!lobby) {
            throw new Error('Lobby not found');
        }

        lobby.status = status;
        await lobby.save();

        return {
            success: true,
            status: lobby.status
        };
    }
}

module.exports = WsBridgeService;
