const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema(
    {
        game_name: { type: String, required: true },
        folder_name: { type: String, required: true, unique: true, index: true },
        description: { type: String, default: '' },
        image_url: { type: String, default: '' },
        status: { type: String, default: 'bientôt', index: true },
        genre: { type: String, default: 'Undefined' },
        max_players: { type: Number, default: 1 },
        is_multiplayer: { type: Boolean, default: false },
        developer: { type: String, default: 'Inconnu' },
        price: { type: Number, default: 0 },
        manifestUrl: { type: String, default: null },
        zipUrl: { type: String, default: null },
        github_url: { type: String, default: null },
        version: { type: String, default: '0.0.0' },
        manifestVersion: { type: String, default: null },
        manifestUpdatedAt: { type: Date, default: null },
    },
    { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

const GameModel = mongoose.models.Game || mongoose.model('Game', gameSchema);

class Games {
    static async getAllGames() {
        const docs = await GameModel.find({}).lean();
        return docs.map((d) => ({ id: d._id.toString(), ...d }));
    }

    static async addGame(game) {
        const doc = await GameModel.create(game);
        return doc._id.toString();
    }

    static async getGameByName(folder_name) {
        const doc = await GameModel.findOne({ folder_name }).lean();
        return doc ? { id: doc._id.toString(), ...doc } : null;
    }

    static async getGameById(gameId) {
        if (!gameId || !mongoose.Types.ObjectId.isValid(gameId)) return null;
        const doc = await GameModel.findById(gameId).lean();
        return doc ? { id: doc._id.toString(), ...doc } : null;
    }

    static async getAvailableGamesFromDB() {
        const docs = await GameModel.find({ status: 'disponible' }).lean();
        return docs.map((d) => ({ id: d._id.toString(), ...d }));
    }

    static async updateManifest(folderName, manifestUrl, manifestVersion) {
        const result = await GameModel.updateOne(
            { folder_name: folderName },
            {
                $set: {
                    manifestUrl: manifestUrl,
                    manifestVersion: manifestVersion,
                    manifestUpdatedAt: new Date(),
                }
            }
        );
        return result.modifiedCount > 0;
    }

    static async updateGameVersion(gameId, version, manifestUrl, zipUrl) {
        // Try to find by ID first, then by folder_name (which might be passed as gameId)
        let query = {};
        if (mongoose.Types.ObjectId.isValid(gameId)) {
            query = { _id: gameId };
        } else {
            query = { folder_name: gameId };
        }

        const result = await GameModel.updateOne(
            query,
            {
                $set: {
                    version: version, // Note: Schema might need 'version' field if not present, checking...
                    // The schema has 'manifestVersion', let's use that or add 'version' if strictly requested.
                    // User asked for "version", "manifestUrl", "zipUrl".
                    // Schema has: manifestVersion, manifestUrl, zipUrl.
                    // I will map 'version' to 'manifestVersion' for consistency with existing schema, 
                    // or I should add 'version' to schema if it's distinct.
                    // Looking at schema: manifestVersion is present. I'll use that.
                    manifestVersion: version,
                    manifestUrl: manifestUrl,
                    zipUrl: zipUrl,
                    manifestUpdatedAt: new Date()
                }
            }
        );
        return result.modifiedCount > 0;
    }

    static async getGamesByKeysOrIds(keys, ids) {
        return await GameModel.find({
            $or: [
                { folder_name: { $in: keys } },
                { _id: { $in: ids } }
            ]
        }).lean();
    }

    static async updateGameMetadata(folderName, updates) {
        const result = await GameModel.updateOne(
            { folder_name: folderName },
            { $set: updates }
        );
        return result.modifiedCount > 0;
    }

    static async findGameByIdOrSlug(identifier) {
        if (!identifier) return null;
        let query;

        if (mongoose.Types.ObjectId.isValid(identifier)) {
            query = { $or: [{ _id: identifier }, { folder_name: identifier }] };
        } else {
            query = { folder_name: identifier };
        }

        const doc = await GameModel.findOne(query).lean();
        return doc ? { id: doc._id.toString(), ...doc } : null;
    }
}

module.exports = Games;
