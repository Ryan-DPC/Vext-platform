const ItemsService = require('./items.service');
const UsersService = require('../users/users.service');

class ItemsController {
    // Récupérer tous les items
    static async getAll(req, res) {
        try {
            const userId = req.user?.id || null;
            const { type, rarity } = req.query;
            const filters = {};

            if (type) filters.item_type = type;
            if (rarity) filters.rarity = rarity;

            const items = await ItemsService.getAll(userId, filters);
            res.status(200).json({ success: true, items });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // Chercher des items
    static async search(req, res) {
        try {
            const query = req.query.q || ''; // Paramètre de recherche
            if (!query) {
                return res.status(400).json({ success: false, message: 'Aucun terme de recherche fourni.' });
            }

            const items = await ItemsService.searchItems(query);
            res.status(200).json({ success: true, items });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // Acheter un item
    static async purchase(req, res) {
        try {
            const userId = req.user.id;
            const { itemId } = req.body;
            if (!itemId) {
                return res.status(400).json({ success: false, message: 'ID d\'item requis.' });
            }

            const result = await ItemsService.purchaseItem(userId, itemId);
            res.status(200).json(result);
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    // Équiper un item
    static async equip(req, res) {
        try {
            const userId = req.user.id;
            const { itemId } = req.body;
            if (!itemId) {
                return res.status(400).json({ success: false, message: 'ID d\'item requis.' });
            }

            const result = await ItemsService.equip(userId, itemId);

            // Mettre à jour la session avec la nouvelle photo de profil si c'est un PDP
            // Note: req.session n'est pas utilisé avec JWT, mais on peut renvoyer l'info au client

            res.status(200).json(result);
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    // Déséquiper un item
    static async unequip(req, res) {
        try {
            const userId = req.user.id;
            const { itemId } = req.body;
            if (!itemId) {
                return res.status(400).json({ success: false, message: 'ID d\'item requis.' });
            }

            const result = await ItemsService.unequip(userId, itemId);

            // Si on déséquipe un PDP, on pourrait vouloir renvoyer la photo par défaut ou précédente
            // Mais pour l'instant on renvoie juste le succès

            res.status(200).json(result);
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    // Récupérer les items possédés par l'utilisateur
    static async getMyItems(req, res) {
        try {
            const userId = req.user.id;
            const items = await ItemsService.getUserItems(userId);
            res.status(200).json({ success: true, items });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // Supprimer (archiver) un item - Admin only (TODO: Add role check)
    static async delete(req, res) {
        try {
            const { itemId } = req.params;
            if (!itemId) {
                return res.status(400).json({ success: false, message: 'ID d\'item requis.' });
            }

            const result = await ItemsService.archiveItem(itemId);
            res.status(200).json(result);
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}

module.exports = ItemsController;
