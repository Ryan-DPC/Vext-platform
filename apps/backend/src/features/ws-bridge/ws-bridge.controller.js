const WsBridgeService = require('./ws-bridge.service');

class WsBridgeController {
    /**
     * Register a user with username
     * POST /api/ws-bridge/register
     * Body: { username: string }
     */
    static async register(req, res) {
        try {
            const { username } = req.body;

            if (!username) {
                return res.status(400).json({
                    error: 'Username is required'
                });
            }

            const result = await WsBridgeService.registerUser(username);
            res.status(200).json(result);
        } catch (error) {
            console.error('Registration error:', error);
            res.status(400).json({
                error: error.message
            });
        }
    }

    /**
     * Create a new lobby
     * POST /api/ws-bridge/lobby
     * Body: { username: string }
     */
    static async createLobby(req, res) {
        try {
            const { username } = req.body;

            if (!username) {
                return res.status(400).json({
                    error: 'Username is required'
                });
            }

            const result = await WsBridgeService.createLobby(username);
            res.status(201).json(result);
        } catch (error) {
            console.error('Create lobby error:', error);
            res.status(400).json({
                error: error.message
            });
        }
    }

    /**
     * Get lobby state by code
     * GET /api/ws-bridge/lobby/:code
     */
    static async getLobby(req, res) {
        try {
            const { code } = req.params;

            const lobby = await WsBridgeService.getLobbyByCode(code);
            res.status(200).json(lobby);
        } catch (error) {
            console.error('Get lobby error:', error);
            const statusCode = error.message === 'Lobby not found' ? 404 : 400;
            res.status(statusCode).json({
                error: error.message
            });
        }
    }

    /**
     * Join an existing lobby
     * POST /api/ws-bridge/lobby/join
     * Body: { lobbyId: string, username: string }
     */
    static async joinLobby(req, res) {
        try {
            const { lobbyId, username } = req.body;

            if (!lobbyId || !username) {
                return res.status(400).json({
                    error: 'Lobby code and username are required'
                });
            }

            const result = await WsBridgeService.joinLobby(lobbyId, username);
            res.status(200).json(result);
        } catch (error) {
            console.error('Join lobby error:', error);
            const statusCode = error.message === 'Lobby not found' ? 404 : 400;
            res.status(statusCode).json({
                error: error.message
            });
        }
    }

    /**
     * Save match scores
     * POST /api/ws-bridge/match/:lobbyId/score
     * Body: { scores: Array<{username: string, score: number}> }
     */
    static async saveScores(req, res) {
        try {
            const { lobbyId } = req.params;
            const { scores } = req.body;

            if (!scores || !Array.isArray(scores)) {
                return res.status(400).json({
                    error: 'Scores array is required'
                });
            }

            const result = await WsBridgeService.saveMatchScores(lobbyId, scores);
            res.status(200).json(result);
        } catch (error) {
            console.error('Save scores error:', error);
            const statusCode = error.message === 'Lobby not found' ? 404 : 400;
            res.status(statusCode).json({
                error: error.message
            });
        }
    }

    /**
     * Update lobby status
     * PATCH /api/ws-bridge/lobby/:code/status
     * Body: { status: string }
     */
    static async updateStatus(req, res) {
        try {
            const { code } = req.params;
            const { status } = req.body;

            if (!status) {
                return res.status(400).json({
                    error: 'Status is required'
                });
            }

            const result = await WsBridgeService.updateLobbyStatus(code, status);
            res.status(200).json(result);
        } catch (error) {
            console.error('Update status error:', error);
            const statusCode = error.message === 'Lobby not found' ? 404 : 400;
            res.status(statusCode).json({
                error: error.message
            });
        }
    }
}

module.exports = WsBridgeController;
