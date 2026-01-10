const express = require('express');
const auth = require('../../middleware/auth');
const router = express.Router();
const ItemsController = require('./items.controller');

// Middleware pour authentification optionnelle
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
        try {
            const jwt = require('jsonwebtoken');
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
        } catch (err) {
            // Token invalide, on continue sans user
        }
    }
    next();
};

// Endpoint pour récupérer tous les items
router.get('/all', optionalAuth, ItemsController.getAll);

// Store endpoint (alias for /all) - for frontend compatibility
router.get('/store', optionalAuth, ItemsController.getAll);

// Endpoint pour rechercher des items
router.get('/search', ItemsController.search);

// Acheter un item (nécessite authentification)
router.post('/purchase', auth, ItemsController.purchase);

// Équiper un item (nécessite authentification)
router.post('/equip', auth, ItemsController.equip);

// Déséquiper un item (nécessite authentification)
router.post('/unequip', auth, ItemsController.unequip);

// Récupérer les items possédés par l'utilisateur (nécessite authentification)
router.get('/my-items', auth, ItemsController.getMyItems);

// Supprimer (archiver) un item (nécessite authentification, idéalement admin)
router.delete('/:itemId', auth, ItemsController.delete);

module.exports = router;
