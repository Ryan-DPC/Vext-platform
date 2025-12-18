const Lobby = require('./lobby.model');
const GameSession = require('./gameSession.model');
const mongoose = require('mongoose');
const Games = require('../games/games.model');

class LobbyService {
    // --- Lobby Management (In-Memory) ---

    static createLobby(socketId) {
        return Lobby.createLobby(socketId);
    }

    static joinLobby(lobbyId, socketId) {
        return Lobby.joinLobby(lobbyId, socketId);
    }

    static getPlayers(lobbyId) {
        return Lobby.getPlayers(lobbyId);
    }

    static removePlayer(socketId) {
        return Lobby.removePlayer(socketId);
    }

    static leaveLobby(socketId) {
        return Lobby.leaveLobby(socketId);
    }

    static getLobby(lobbyId) {
        return Lobby.getLobby(lobbyId);
    }

    static getAllLobbies() {
        return Lobby.getAllLobbies();
    }

    // --- Game Session Management (Database) ---

    /**
     * Vérifier si l'utilisateur a déjà un jeu en cours
     * @param {string} userId - ID de l'utilisateur
     * @returns {Promise<Object|null>} - Session active ou null
     */
    static async getActiveSession(userId) {
        try {
            const session = await GameSession.findOne({
                user_id: new mongoose.Types.ObjectId(userId),
                status: 'active'
            }).lean();

            // Vérifier si la session est expirée (pas de heartbeat depuis 5 minutes)
            if (session) {
                const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
                if (new Date(session.last_heartbeat).getTime() < fiveMinutesAgo) {
                    // Marquer comme timeout
                    await GameSession.updateOne(
                        { _id: session._id },
                        { $set: { status: 'timeout' } }
                    );
                    return null;
                }

                // Vérifier si le processus existe encore (si un PID est disponible)
                if (session.process_id) {
                    try {
                        const isWindows = process.platform === 'win32';

                        // Vérifier de manière synchrone pour éviter les problèmes d'async
                        const { execSync } = require('child_process');
                        try {
                            if (isWindows) {
                                execSync(`tasklist /FI "PID eq ${session.process_id}" /FO CSV`, { stdio: 'ignore' });
                            } else {
                                execSync(`ps -p ${session.process_id} -o pid=`, { stdio: 'ignore' });
                            }
                            // Le processus existe toujours
                        } catch (checkError) {
                            // Le processus n'existe plus, marquer la session comme terminée
                            await GameSession.updateOne(
                                { _id: session._id },
                                { $set: { status: 'ended', ended_at: new Date() } }
                            );
                            return null; // Retourner null car la session n'est plus active
                        }
                    } catch (processCheckError) {
                        // Ignorer les erreurs de vérification de processus
                        console.warn('[Lobby] Erreur lors de la vérification du processus:', processCheckError.message);
                    }
                }
            }

            return session;
        } catch (error) {
            console.error('Erreur lors de la récupération de la session active:', error);
            throw error;
        }
    }

    /**
     * Créer une nouvelle session de jeu
     * @param {string} userId - ID de l'utilisateur
     * @param {string} gameId - ID du jeu (ObjectId ou folder_name)
     * @param {string} gameFolderName - Nom du dossier du jeu
     * @param {string} ownershipToken - Token de possession
     * @returns {Promise<Object>} - Session créée
     */
    static async createSession(userId, gameId, gameFolderName, ownershipToken) {
        try {
            // Vérifier s'il y a déjà une session active
            const activeSession = await this.getActiveSession(userId);
            if (activeSession) {
                throw new Error(`Un jeu est déjà en cours: ${activeSession.game_folder_name}. Veuillez fermer ce jeu avant d'en lancer un autre.`);
            }

            // Générer un token de session
            const sessionToken = require('crypto').randomBytes(32).toString('hex');

            // Convertir gameId en ObjectId si nécessaire
            let gameObjectId = gameId;
            if (typeof gameId === 'string' && mongoose.Types.ObjectId.isValid(gameId)) {
                gameObjectId = new mongoose.Types.ObjectId(gameId);
            } else {
                // Si c'est un folder_name, chercher le jeu
                const game = await Games.getGameByName(gameId);
                if (game) {
                    gameObjectId = new mongoose.Types.ObjectId(game.id);
                } else {
                    gameObjectId = null; // Pour les jeux .exe manuels
                }
            }

            const session = await GameSession.create({
                user_id: new mongoose.Types.ObjectId(userId),
                game_id: gameObjectId,
                game_folder_name: gameFolderName,
                ownership_token: ownershipToken,
                session_token: sessionToken,
                status: 'active'
            });

            return {
                id: session._id.toString(),
                sessionToken: sessionToken,
                gameFolderName: gameFolderName,
                startedAt: session.started_at
            };
        } catch (error) {
            console.error('Erreur lors de la création de la session:', error);
            throw error;
        }
    }

    /**
     * Mettre à jour le heartbeat d'une session
     * @param {string} sessionToken - Token de session
     * @returns {Promise<boolean>} - True si mis à jour
     */
    static async updateHeartbeat(sessionToken) {
        try {
            const result = await GameSession.updateOne(
                { session_token: sessionToken, status: 'active' },
                { $set: { last_heartbeat: new Date() } }
            );
            return result.modifiedCount > 0;
        } catch (error) {
            console.error('Erreur lors de la mise à jour du heartbeat:', error);
            return false;
        }
    }

    /**
     * Terminer une session de jeu
     * @param {string} sessionToken - Token de session
     * @returns {Promise<boolean>} - True si terminée
     */
    static async endSession(sessionToken) {
        try {
            const result = await GameSession.updateOne(
                { session_token: sessionToken },
                { $set: { status: 'ended', ended_at: new Date() } }
            );
            return result.modifiedCount > 0;
        } catch (error) {
            console.error('Erreur lors de la fin de session:', error);
            return false;
        }
    }

    /**
     * Terminer toutes les sessions actives d'un utilisateur
     * @param {string} userId - ID de l'utilisateur
     * @returns {Promise<number>} - Nombre de sessions terminées
     */
    static async endAllUserSessions(userId) {
        try {
            const result = await GameSession.updateMany(
                { user_id: new mongoose.Types.ObjectId(userId), status: 'active' },
                { $set: { status: 'ended', ended_at: new Date() } }
            );
            return result.modifiedCount;
        } catch (error) {
            console.error('Erreur lors de la fin de toutes les sessions:', error);
            throw error;
        }
    }

    /**
     * Obtenir les informations d'une session
     * @param {string} sessionToken - Token de session
     * @returns {Promise<Object|null>} - Session ou null
     */
    static async getSession(sessionToken) {
        try {
            const session = await GameSession.findOne({
                session_token: sessionToken
            }).lean();

            return session;
        } catch (error) {
            console.error('Erreur lors de la récupération de la session:', error);
            return null;
        }
    }
}

module.exports = LobbyService;
