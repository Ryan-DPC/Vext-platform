const GamesService = require('./games.service');

class GamesController {
    static async getAllGames(req, res) {
        try {
            const games = await GamesService.getAllGames();
            res.status(200).json(games);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    }

    static async addGame(req, res) {
        try {
            const gameId = await GamesService.addGame(req.body);
            res.status(201).json({ message: 'Game added successfully.', id: gameId });
        } catch (err) {
            res.status(500).json({ message: 'Error adding game.' });
        }
    }

    static async getGameById(req, res) {
        try {
            const { id } = req.params;
            // Try to find by ID or Slug (folder_name)
            // The service currently has getGameByName which takes folder_name.
            // We should probably update service to handle both or just pass it.
            // For now, assuming id might be slug.
            const game = await GamesService.getGameByName(id);
            res.json(game);
        } catch (err) {
            res.status(404).json({ message: err.message });
        }
    }

    static async getGameDetails(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user?.id;
            const details = await GamesService.getGameDetails(id, userId);
            res.json(details);
        } catch (err) {
            res.status(404).json({ message: err.message });
        }
    }

    static async getManifest(req, res) {
        try {
            const { id } = req.params;
            const manifest = await GamesService.getManifest(id);
            res.json(manifest);
        } catch (error) {
            res.status(404).json({ error: error.message });
        }
    }

    static async updateGame(req, res) {
        try {
            // Support both my original design and the user's "Option B" style fields
            const { gameId, version, manifestUrl, zipUrl, downloadUrl, latestVersion } = req.body;

            const finalVersion = version || latestVersion;
            const finalZipUrl = zipUrl || downloadUrl;

            // If gameId is missing, we can't proceed unless we try to infer it (not safe)
            if (!gameId || !finalVersion) {
                return res.status(400).json({ message: 'Missing required fields: gameId, version' });
            }

            await GamesService.updateGameVersion(gameId, finalVersion, manifestUrl, finalZipUrl);
            res.json({ success: true });
        } catch (error) {
            console.error('Error updating game:', error);
            res.status(500).json({ message: error.message });
        }
    }

    static async getManifestUrl(req, res) {
        try {
            const { folder_name } = req.params; // Using folder_name as ID for consistency in routes
            const url = await GamesService.getManifestUrl(folder_name);
            res.json({ url });
        } catch (error) {
            res.status(404).json({ message: error.message });
        }
    }
    static async installGame(req, res) {
        try {
            const { id } = req.params;
            const result = await GamesService.installGame(id);
            res.json(result);
        } catch (err) {
            console.error('Error installing game:', err);
            res.status(500).json({ message: err.message });
        }
    }
}

module.exports = GamesController;
