const { Blockchain, Transaction } = require('../../services/blockchain.service');
const { generateGameKey, isValidKeyFormat } = require('../../utils/gameKeys');
const crypto = require('crypto');
const Games = require('../games/games.model');
const Users = require('../users/user.model');
const GameOwnership = require('../game-ownership/game-ownership.model'); // UNIFIED MODEL
const Commission = require('./commissions.model');
const BlockchainTx = require('./blockchainTx.model');
const GameKey = require('./gameKeys.model');
const CloudinaryService = require('../../services/cloudinary.service');
const NpmInstaller = require('../../utils/npmInstaller');
const path = require('path');
const fs = require('fs');
const logger = require('../../utils/logger'); // LOGS STRUCTURES (Point 4)

// GESTION DES CHEMINS (Point 4)
const GAMES_LIBRARY_PATH = process.env.GAMES_LIBRARY_PATH || path.join(__dirname, '../../../games');

class LibraryService {
    constructor() {
        this.blockchain = new Blockchain();
        this.platformCommissionRate = 0.1; // 10% pour la plateforme
        this.developerCommissionRate = 0.05; // 5% pour le développeur
    }

    // Générer un token de possession unique (NFT-like) - DÉPRÉCIÉ, on utilise game_key maintenant
    generateOwnershipToken(userId, gameId) {
        const data = `${userId}-${gameId}-${Date.now()}-${Math.random()}`;
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    async debugFix(userId) {
        // ... (Debug logic kept as is but could be optimized if heavily used)
        // For now, focusing on logger and path in next methods
        const mongoose = require('mongoose');
        const BlockchainTx = mongoose.models.BlockchainTransaction || mongoose.model('BlockchainTransaction');
        const Game = mongoose.models.Game || mongoose.model('Game');
        const userIdObj = new mongoose.Types.ObjectId(userId);

        // 1. Fix Marketplace
        const deletedListings = 0;

        // 2. Fix Transactions (Optimization: use lean on findOne)
        const game = await Game.findOne({ folder_name: 'spludbuster' }).select('_id').lean();
        let fixedTxs = 0;
        if (game) {
            const userAddress = `user_${userId}`;
            // Optimization: Update many at once instead of loop
            const result = await BlockchainTx.updateMany({
                $or: [{ from_address: userAddress }, { to_address: userAddress }],
                amount: 5,
                game_id: null
            }, { $set: { game_id: game._id } });
            fixedTxs = result.modifiedCount;
        }

        // 3. Debug Library
        const ownedGames = await GameOwnership.find({ user_id: userIdObj, status: 'owned' })
            .populate('game_id')
            .lean();

        return {
            success: true,
            deletedListings: 0,
            fixedTransactions: fixedTxs,
            ownedGamesCount: ownedGames.length,
            ownedGames: ownedGames.map(g => ({
                id: g._id,
                game_name: g.game_id?.game_name,
                folder_name: g.game_id?.folder_name,
                game_id_raw: g.game_id
            }))
        };
    }

    // Acheter un jeu depuis le store officiel
    async purchaseGame(userId, gameId) {
        const mongoose = require('mongoose');
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Convertir gameId en string
            let gameIdStr = String(gameId).trim();
            let folderName = null;

            // Détecter si c'est un ID Cloudinary factice (format: cloudinary_${folderName})
            if (gameIdStr.startsWith('cloudinary_')) {
                folderName = gameIdStr.replace(/^cloudinary_/, '');
                logger.info(`[Library] Détection ID Cloudinary factice, folder_name: ${folderName}`);
            } else if (!mongoose.Types.ObjectId.isValid(gameIdStr)) {
                // Si ce n'est pas un ObjectId, on suppose que c'est un folder_name (slug)
                folderName = gameIdStr;
                logger.info(`[Library] ID non-ObjectId détecté, utilisation comme folder_name: ${folderName}`);
            }

            // OPTIMISATION (Point 2): Utilisation de findGameByIdOrSlug au lieu de getAllGames() + find()
            let game = await Games.findGameByIdOrSlug(gameIdStr);

            // Si le jeu n'existe pas dans MongoDB mais qu'on a un folder_name, le créer depuis Cloudinary
            // NOTE: On ne fait pas cette opération dans la transaction car elle implique des appels externes (Cloudinary)
            // et la création de jeu indépendante de l'achat.
            if (!game && folderName) {
                // ... (Logic de création de jeu depuis Cloudinary conservée telle quelle, mais exécutée avant la transaction critique si possible?)
                // Pour simplifier, on garde la logique ici, mais sachez que Game.addGame crée sa propre entrée.
                // Idéalement, addGame devrait supporter une session, mais ici on crée le jeu DANS la DB globalement, 
                // donc ça peut être hors de la transaction d'achat de l'utilisateur.

                // ... (Cloudinary logic redacted for brevity, assuming existing logic works) ...
                // REPLICATION DE LA LOGIQUE EXISTANTE (Simplifiée pour l'insert)

                logger.info(`[Library] Jeu ${folderName} non trouvé dans MongoDB, tentative de création depuis Cloudinary...`);
                try {
                    const cloudinaryService = new CloudinaryService();
                    if (cloudinaryService.isEnabled()) {
                        // Try to fetch manifest directly for dev games
                        const manifestUrl = cloudinaryService.getPublicUrl(`games/dev/${folderName}/manifest.json`, 'raw');
                        try {
                            const response = await fetch(manifestUrl);
                            if (response.ok) {
                                const manifest = await response.json();
                                const gameData = {
                                    game_name: manifest.gameName || folderName,
                                    folder_name: folderName,
                                    description: manifest.description || '',
                                    image_url: cloudinaryService.getPublicUrl(`games/dev/${folderName}/image.png`, 'image') || '/assets/images/default-game.png',
                                    status: 'disponible',
                                    genre: manifest.genre || 'Undefined',
                                    max_players: manifest.maxPlayers || 1,
                                    is_multiplayer: manifest.isMultiplayer || false,
                                    developer: manifest.developer || 'Inconnu',
                                    price: manifest.price || 0,
                                    manifestUrl: manifestUrl,
                                    manifestVersion: manifest.version || '1.0.0',
                                    manifestUpdatedAt: new Date(),
                                };
                                const newGameId = await Games.addGame(gameData);
                                game = await Games.getGameById(newGameId);
                            } else {
                                const cloudinaryGames = await cloudinaryService.getAllGames(false);
                                const cloudinaryGame = cloudinaryGames.find(g => g.folder_name === folderName);
                                if (cloudinaryGame) {
                                    const gameData = {
                                        game_name: cloudinaryGame.game_name || folderName,
                                        folder_name: folderName,
                                        description: cloudinaryGame.description || '',
                                        image_url: cloudinaryGame.image_url || '/assets/images/default-game.png',
                                        status: 'disponible',
                                        genre: cloudinaryGame.genre || 'Undefined',
                                        max_players: cloudinaryGame.max_players || 1,
                                        is_multiplayer: cloudinaryGame.is_multiplayer || false,
                                        developer: cloudinaryGame.developer || 'Inconnu',
                                        price: cloudinaryGame.price || 0,
                                        manifestUrl: cloudinaryGame.manifestUrl || null,
                                        manifestVersion: cloudinaryGame.manifestVersion || null,
                                        manifestUpdatedAt: cloudinaryGame.manifestUpdatedAt || null,
                                    };
                                    const newGameId = await Games.addGame(gameData);
                                    game = await Games.getGameById(newGameId);
                                }
                            }
                        } catch (err) {
                            console.warn(`[Library] Error fetching dev game manifest: ${err.message}`);
                        }
                    }
                } catch (cloudinaryError) {
                    console.warn(`[Library] ⚠️ Impossible de créer le jeu depuis Cloudinary:`, cloudinaryError.message);
                }
            }

            // Re-check game existence inside transaction just in case catch logic above succeeded
            if (!game && folderName) {
                game = await Games.getGameByName(folderName);
            }

            if (!game) {
                // Abort before throwing
                // Actually catch block handles abort
                throw new Error(`Jeu non trouvé (ID: ${gameIdStr}${folderName ? `, folder_name: ${folderName}` : ''})`);
            }

            const gameObjectId = new mongoose.Types.ObjectId(game.id || game._id);
            const userIdObj = new mongoose.Types.ObjectId(userId);

            // Vérifier si l'utilisateur possède déjà le jeu
            const existing = await GameOwnership.findOne({
                user_id: userIdObj,
                game_id: gameObjectId,
                status: 'owned'
            }).session(session).lean(); // Use session for read consistency

            if (existing) {
                throw new Error('Vous possédez déjà ce jeu.');
            }

            const user = await Users.getUserById(userId);
            if (!user) {
                throw new Error('Utilisateur non trouvé');
            }

            const gamePriceCHF = game.price || 0;

            // Récupérer une game_key existante non utilisée, sinon en générer une nouvelle
            let gameKey = null;
            const availableKey = await GameKey.findOne({
                game_id: gameObjectId,
                is_used: false
            }).session(session).lean();

            if (availableKey) {
                // Utiliser une clé existante
                gameKey = availableKey.key;
                // Marquer comme utilisée
                await GameKey.updateOne({ _id: availableKey._id }, {
                    $set: { is_used: true, used_by: userIdObj, used_at: new Date() }
                }, { session });
            } else {
                // Générer une nouvelle clé de jeu unique
                gameKey = generateGameKey();
                // Check collision (Looping with await inside transaction is fine)
                let exists = await GameOwnership.findOne({ game_key: gameKey }).session(session) || await GameKey.findOne({ key: gameKey }).session(session);
                while (exists) {
                    gameKey = generateGameKey();
                    exists = await GameOwnership.findOne({ game_key: gameKey }).session(session) || await GameKey.findOne({ key: gameKey }).session(session);
                }
            }

            // Vérifier le solde CHF si jeu payant
            const userCHF = (user.balances && user.balances.chf) || 0;
            if (gamePriceCHF > 0 && userCHF < gamePriceCHF) {
                throw new Error(`Solde CHF insuffisant. Vous avez ${userCHF.toFixed(2)} CHF, prix: ${gamePriceCHF.toFixed(2)} CHF`);
            }

            // Déterminer le type de jeu
            let gameType = 'web';
            try {
                const gameManifestPath = path.join(GAMES_LIBRARY_PATH, game.folder_name || '', 'manifest.json');
                if (fs.existsSync(gameManifestPath)) {
                    const manifest = JSON.parse(fs.readFileSync(gameManifestPath, 'utf8'));
                    if (manifest.platform === 'exe' || manifest.entryPoint?.endsWith('.exe')) {
                        gameType = 'exe';
                    }
                } catch (e) { }

                let transaction = null;

                // Create Transaction object for free game
                transaction = new Transaction(
                    user.wallet_address || `user_${userId}`,
                    `platform_${gameObjectId}`,
                    0, // Amount is 0
                    'game_purchase',
                    gameObjectId.toString()
                );

                await GameOwnership.create([{
                    user_id: userIdObj,
                    game_id: gameObjectId,
                    game_key: gameKey,
                    game_name: game.game_name,
                    purchase_price: 0,
                    current_price: 0,
                    status: 'owned',
                    for_sale: false,
                    installed: false,
                    game_type: gameType
                }], { session });

                // Record transaction in DB (even for free games)
                await BlockchainTx.create([{
                    transaction_id: transaction.transactionId,
                    from_address: transaction.fromAddress,
                    to_address: transaction.toAddress,
                    amount: 0,
                    transaction_type: 'game_purchase', // Use 'game_purchase' type
                    game_id: gameObjectId,
                    game_key: gameKey
                }], { session });

                await session.commitTransaction();

                // Update in-memory blockchain (non-blocking)
                try {
                    this.blockchain.createTransaction(transaction);
                    this.blockchain.minePendingTransactions('platform_wallet');
                } catch (bcError) {
                    console.warn('[Library] Warning: Failed to update in-memory blockchain for free game.', bcError);
                }

                return {
                    success: true,
                    gameKey,
                    remainingBalance: userCHF
                };

                // Pour les jeux payants
                // Créer transaction blockchain (objet JS, pas encore DB)
                transaction = new Transaction(
                    user.wallet_address || `user_${userId}`,
                    `platform_${gameObjectId}`,
                    gamePriceCHF,
                    'game_purchase',
                    gameObjectId.toString()
                );

                // Calculer les commissions
                const platformCommission = Math.floor(gamePriceCHF * this.platformCommissionRate);
                const developerCommission = Math.floor(gamePriceCHF * this.developerCommissionRate);

                // Débiter le solde CHF (AVEC SESSION)
                await Users.decrementBalance(userId, 'CHF', gamePriceCHF, session);

                // Enregistrer la possession (AVEC SESSION)
                await GameOwnership.create([{
                    user_id: userIdObj,
                    game_id: gameObjectId,
                    game_key: gameKey,
                    game_name: game.game_name,
                    purchase_price: gamePriceCHF,
                    current_price: gamePriceCHF,
                    status: 'owned',
                    for_sale: false,
                    installed: false,
                    game_type: gameType
                }], { session });

                // Enregistrer les commissions (AVEC SESSION)
                await Commission.create([{
                    transaction_id: transaction.transactionId,
                    recipient_type: 'platform',
                    recipient_id: null,
                    amount: platformCommission,
                    percentage: this.platformCommissionRate
                }], { session });

                await Commission.create([{
                    transaction_id: transaction.transactionId,
                    recipient_type: 'developer',
                    recipient_id: game.developer || null,
                    amount: developerCommission,
                    percentage: this.developerCommissionRate
                }], { session });

                // Enregistrer la transaction blockchain DB (AVEC SESSION)
                await BlockchainTx.create([{
                    transaction_id: transaction.transactionId,
                    from_address: transaction.fromAddress,
                    to_address: transaction.toAddress,
                    amount: transaction.amount,
                    transaction_type: transaction.type,
                    game_id: gameObjectId,
                    game_key: gameKey
                }], { session });

                // Commit Transaction
                await session.commitTransaction();

                // Operations post-commit (non bloquantes pour la DB, mais importantes pour l'état en mémoire)
                try {
                    this.blockchain.createTransaction(transaction);
                    this.blockchain.minePendingTransactions('platform_wallet');
                } catch (bcError) {
                    console.warn('[Library] Warning: Failed to update in-memory blockchain, but DB is consistent.', bcError);
                }

                // Récupérer le solde CHF final (Lecture simple)
                const updatedUser = await Users.getUserById(userId);
                const finalCHF = (updatedUser.balances && updatedUser.balances.chf) || 0;

                return {
                    success: true,
                    gameKey,
                    transactionId: transaction?.transactionId || null,
                    remainingBalance: finalCHF
                };

            } catch (error) {
                console.error('Erreur lors de l\'achat du jeu :', error);
                if (session.inTransaction()) {
                    await session.abortTransaction();
                }
                throw error;
            } finally {
                session.endSession();
            }
        }

    // Lister un jeu à la revente
    async listGameForSale(gameKey, askingPrice, sellerId) {
            try {
                const mongoose = require('mongoose');
                const sellerIdObj = new mongoose.Types.ObjectId(sellerId);

                const ownership = await GameOwnership.findOne({ game_key: gameKey, user_id: sellerIdObj, status: 'owned' }).lean();

                if (!ownership) {
                    throw new Error('Jeu non possédé ou non disponible à la vente');
                }

                // UNIFIED SYSTEM: Use for_sale field directly
                await GameOwnership.updateOne(
                    { game_key: gameKey },
                    {
                        $set: {
                            for_sale: true,
                            asking_price: Number(askingPrice),
                            listed_at: new Date(),
                            status: 'listed_for_sale',
                            current_price: Number(askingPrice),
                            installed: false
                        }
                    }
                );

                return { success: true, gameKey };

            } catch (error) {
                console.error('Erreur lors de la mise en vente :', error);
                throw error;
            }
        }

    // Acheter un jeu d'occasion
    async purchaseUsedGame(buyerId, gameKey, sellerId) {
            try {
                const mongoose = require('mongoose');
                const sellerIdObj = new mongoose.Types.ObjectId(sellerId);
                // UNIFIED SYSTEM: Check for_sale status directly
                const listing = await GameOwnership.findOne({
                    game_key: gameKey,
                    user_id: sellerIdObj,
                    for_sale: true,
                    status: 'listed_for_sale'
                }).lean();

                if (!listing) {
                    throw new Error('Jeu non disponible à la vente');
                }

                // Vérifier que l'acheteur a assez de CHF
                const buyer = await Users.getUserById(buyerId);
                const buyerCHF = (buyer?.balances && buyer.balances.chf) || 0;
                if (!buyer || buyerCHF < listing.asking_price) {
                    throw new Error(`Solde CHF insuffisant. Vous avez ${buyerCHF.toFixed(2)} CHF, prix: ${listing.asking_price.toFixed(2)} CHF`);
                }

                // Calculer les commissions (plus faibles pour la revente)
                const platformCommission = Math.floor(listing.asking_price * 0.05); // 5% pour la plateforme
                const developerCommission = Math.floor(listing.asking_price * 0.02); // 2% pour le développeur
                const sellerAmount = listing.asking_price - platformCommission - developerCommission;

                // Créer la transaction blockchain
                const transaction = new Transaction(buyer.wallet_address || `user_${buyerId}`, `user_${sellerId}`, listing.asking_price, 'game_sale', listing.game_id);

                this.blockchain.createTransaction(transaction);

                // Transférer la possession (game_key reste le même, seul user_id change)
                const buyerIdObj = new mongoose.Types.ObjectId(buyerId);
                await GameOwnership.updateOne({ game_key: gameKey }, { $set: { user_id: buyerIdObj, status: 'owned', current_price: listing.asking_price } });

                // Mettre à jour le marketplace
                // Mettre à jour le marketplace - Not needed as GameOwnership update handles it (status: 'owned', for_sale: false implicitly if not set or we should set it explicitly)
                // Actually, we already updated GameOwnership above at line 411 (which is now 408 in modified file)
                // But we need to make sure we clear the for_sale flag and price

                // Re-update to ensure clean state (or we could have done it in one go above)
                // The previous update was:
                // await GameOwnership.updateOne({ game_key: gameKey }, { $set: { user_id: buyerIdObj, status: 'owned', current_price: listing.asking_price } });

                // We should add for_sale: false, asking_price: null, listed_at: null to that update.
                // Since I can't easily merge with previous chunk without context, I'll do a second update here or modify the previous one if I can.
                // Let's just do a clean up update here to be safe.
                await GameOwnership.updateOne(
                    { game_key: gameKey },
                    {
                        $set: {
                            for_sale: false,
                            asking_price: null,
                            listed_at: null,
                            current_price: listing.asking_price // Keep purchase price as current value
                        }
                    }
                );

                // Transférer les CHF
                await Users.decrementBalance(buyerId, 'CHF', listing.asking_price);
                const seller = await Users.getUserById(sellerId);
                const sellerCHF = (seller?.balances && seller.balances.chf) || 0;
                await Users.updateUserBalance(sellerId, 'CHF', sellerCHF + sellerAmount);

                // Enregistrer les commissions
                await Commission.create({ transaction_id: transaction.transactionId, recipient_type: 'platform', recipient_id: null, amount: platformCommission, percentage: 0.05 });

                await Commission.create({ transaction_id: transaction.transactionId, recipient_type: 'developer', recipient_id: listing.developer || null, amount: developerCommission, percentage: 0.02 });

                // Enregistrer la transaction avec game_key comme token
                await BlockchainTx.create({ transaction_id: transaction.transactionId, from_address: transaction.fromAddress, to_address: transaction.toAddress, amount: transaction.amount, transaction_type: transaction.type, game_id: listing.game_id, game_key: gameKey });

                // Miner la transaction
                this.blockchain.minePendingTransactions('platform_wallet');

                return {
                    success: true,
                    transactionId: transaction.transactionId,
                    sellerAmount,
                    platformCommission,
                    developerCommission
                };

            } catch (error) {
                console.error('Erreur lors de l\'achat d\'occasion :', error);
                throw error;
            }
        }

    // Installer un jeu
    async installGame(userId, gameKey) {
            try {
                const mongoose = require('mongoose');
                const userIdObj = new mongoose.Types.ObjectId(userId);
                const ownership = await GameOwnership.findOne({ game_key: gameKey, user_id: userIdObj, status: 'owned' }).populate('game_id').lean();
                if (!ownership) {
                    throw new Error('Jeu non trouvé ou non possédé');
                }
                if (ownership.installed) {
                    return { success: true, message: 'Jeu déjà installé' };
                }

                // Obtenir le chemin du dossier du jeu
                const game = ownership.game_id;
                const gameFolderName = game?.folder_name;
                let gameFolderPath = null;

                if (gameFolderName) {
                    // GAMES_LIBRARY_PATH (Point 4)
                    gameFolderPath = path.join(GAMES_LIBRARY_PATH, gameFolderName);

                    // Installer automatiquement les dépendances npm si nécessaire
                    try {
                        if (NpmInstaller.needsNpmInstall(gameFolderPath) && !NpmInstaller.areDependenciesInstalled(gameFolderPath)) {
                            console.log(`[Library] Installation automatique des dépendances pour ${gameFolderName}...`);
                            await NpmInstaller.installDependencies(gameFolderPath);
                        }
                    } catch (npmError) {
                        console.warn(`[Library] ⚠️ Impossible d'installer les dépendances automatiquement:`, npmError.message);
                        // Ne pas faire échouer l'installation si l'installation npm échoue
                    }
                }

                await GameOwnership.updateOne({ game_key: gameKey }, { $set: { installed: true } });
                return { success: true, message: 'Jeu installé avec succès' };
            } catch (error) {
                console.error('Erreur lors de l\'installation :', error);
                throw error;
            }
        }

    // Obtenir les jeux possédés par un utilisateur
    async getUserOwnedGames(userId) {
            try {
                const mongoose = require('mongoose');
                const userIdObj = new mongoose.Types.ObjectId(userId);

                // NOTE: GameSessionService is not yet migrated. 
                // For now, we will skip the active session check or implement a basic version if needed.
                // Assuming GameSessionService will be migrated later or is part of Lobby/Games feature.
                // For now, we'll just return false for is_active.

                const rows = await GameOwnership.find({ user_id: userIdObj, status: 'owned' })
                    .sort({ purchase_date: -1 })
                    .populate('game_id', { game_name: 1, image_url: 1, developer: 1, genre: 1, folder_name: 1 })
                    .lean();

                return rows.map(r => {
                    // Détecter automatiquement le type de jeu si non défini ou incorrect
                    let gameType = r.game_type || 'web';
                    const folderName = r.game_id?.folder_name;

                    if (folderName) {
                        try {
                            // Vérifier si c'est un jeu Electron (.exe)
                            const gameManifestPath = path.join(GAMES_LIBRARY_PATH, folderName, 'manifest.json');
                            if (fs.existsSync(gameManifestPath)) {
                                const manifest = JSON.parse(fs.readFileSync(gameManifestPath, 'utf8'));
                                if (manifest.platform === 'exe' || manifest.entryPoint?.endsWith('.exe')) {
                                    gameType = 'exe';

                                    // Mettre à jour la base de données si le type était incorrect
                                    if (r.game_type !== 'exe') {
                                        GameOwnership.updateOne(
                                            { _id: r._id },
                                            { $set: { game_type: 'exe' } }
                                        ).catch(err => console.warn(`[Library] Erreur lors de la mise à jour du game_type pour ${folderName}:`, err.message));
                                    }
                                }
                            }
                        } catch (e) {
                            // Ignorer les erreurs, utiliser le type existant
                        }
                    }

                    return {
                        game_key: r.game_key, // game_key est le token principal
                        _id: r.game_id?._id, // Added _id (Game ID) as per spec
                        installed: r.installed || false,
                        purchase_price: r.purchase_price,
                        current_price: r.current_price,
                        game_name: r.game_id?.game_name || r.game_name, // Support pour jeux manuels
                        folder_name: r.game_id?.folder_name,
                        image_url: r.game_id?.image_url,
                        developer: r.game_id?.developer,
                        genre: r.game_id?.genre,
                        game_type: gameType, // Type de jeu détecté automatiquement
                        is_manual_add: r.is_manual_add || false, // True si ajouté manuellement
                        ownership_token: r.ownership_token || r.game_key, // Pour les jeux .exe
                        status: r.status || 'owned', // Statut de possession
                        is_resellable: r.is_resellable !== false, // Par défaut true, sauf si explicitement false
                        is_active: false, // TODO: Implement session check when GameSessionService is available
                        session_token: null
                    };
                });
            } catch (error) {
                console.error('Erreur lors de la récupération des jeux :', error);
                throw error;
            }
        }

    // Obtenir les ventes actives d'un utilisateur
    async getUserActiveSales(userId) {
            try {
                const mongoose = require('mongoose');
                const userIdObj = new mongoose.Types.ObjectId(userId);
                // UNIFIED SYSTEM: Use for_sale: true
                const rows = await GameOwnership.find({ user_id: userIdObj, for_sale: true })
                    .sort({ listed_at: -1 })
                    .populate('game_id', { game_name: 1, image_url: 1, developer: 1, genre: 1, price: 1 })
                    .lean();
                return rows.map(r => ({
                    game_key: r.game_key,
                    asking_price: r.asking_price,
                    game_name: r.game_id?.game_name,
                    image_url: r.game_id?.image_url,
                    developer: r.game_id?.developer,
                    genre: r.game_id?.genre,
                    listed_at: r.listed_at,
                }));
            } catch (error) {
                console.error('Erreur lors de la récupération des ventes actives :', error);
                throw error;
            }
        }

    // Obtenir les jeux en vente sur le marketplace (excluant les ventes de l'utilisateur connecté)
    async getMarketplaceGames(filters = {}, excludeUserId = null) {
            try {
                // UNIFIED SYSTEM: Use for_sale: true
                const query = { for_sale: true };
                const { minPrice, maxPrice, genre, sort } = filters;

                // Exclure les ventes de l'utilisateur connecté
                if (excludeUserId) {
                    const mongoose = require('mongoose');
                    query.user_id = { $ne: new mongoose.Types.ObjectId(excludeUserId) };
                }

                if (minPrice || maxPrice) {
                    query.asking_price = {};
                    if (minPrice) query.asking_price.$gte = Number(minPrice);
                    if (maxPrice) query.asking_price.$lte = Number(maxPrice);
                }

                let sortSpec = { listed_at: -1 };
                if (sort === 'price_asc') sortSpec = { asking_price: 1 };
                if (sort === 'price_desc') sortSpec = { asking_price: -1 };

                const rows = await GameOwnership.find(query)
                    .sort(sortSpec)
                    .populate('game_id', { game_name: 1, image_url: 1, developer: 1, genre: 1, price: 1 })
                    .populate('user_id', { username: 1 }) // user_id is the seller
                    .lean();
                const filtered = rows.filter(r => (genre ? (r.game_id?.genre || '').toLowerCase() === String(genre).toLowerCase() : true));
                return filtered.map(r => ({
                    game_key: r.game_key, // game_key est le token blockchain
                    asking_price: r.asking_price,
                    seller_id: r.user_id?._id?.toString(),
                    seller_name: r.user_id?.username,
                    game_name: r.game_id?.game_name,
                    image_url: r.game_id?.image_url,
                    developer: r.game_id?.developer,
                    genre: r.game_id?.genre,
                    price: r.game_id?.price,
                }));
            } catch (error) {
                console.error('Erreur lors de la récupération du marketplace :', error);
                throw error;
            }
        }

    // Obtenir l'historique des transactions d'un utilisateur
    async getUserTransactionHistory(userId) {
            try {
                const userAddress = `user_${userId}`;
                const rows = await BlockchainTx.find({ $or: [{ from_address: userAddress }, { to_address: userAddress }] })
                    .sort({ timestamp: -1 })
                    .populate('game_id', { game_name: 1, image_url: 1 })
                    .lean();
                return rows.map(r => {
                    const isFrom = r.from_address === userAddress;

                    // Déterminer si l'utilisateur est vendeur ou acheteur
                    let userRole = 'unknown';
                    if (r.transaction_type === 'game_purchase') {
                        // Pour game_purchase, l'utilisateur est toujours from_address (acheteur)
                        userRole = 'buyer';
                    } else if (r.transaction_type === 'game_sale') {
                        // Pour game_sale, si from_address = user, c'est un vendeur, sinon c'est un acheteur
                        userRole = isFrom ? 'seller' : 'buyer';
                    }

                    return {
                        transaction_id: r.transaction_id,
                        from_address: r.from_address,
                        to_address: r.to_address,
                        amount: r.amount,
                        transaction_type: r.transaction_type,
                        game_name: r.game_id?.game_name || null,
                        image_url: r.game_id?.image_url || null,
                        timestamp: r.timestamp,
                        user_role: userRole, // 'buyer' ou 'seller'
                    };
                });
            } catch (error) {
                console.error('Erreur lors de la récupération de l\'historique :', error);
                throw error;
            }
        }

    // Vendre un jeu
    async sellGame(gameKey, price, userId) {
            try {
                const ownership = await GameOwnership.findOne({ game_key: gameKey }).lean();

                if (!ownership) {
                    throw new Error('Possession de jeu non trouvée');
                }

                const mongoose = require('mongoose');
                if (ownership.user_id.toString() !== userId.toString()) {
                    throw new Error('Non autorisé à vendre ce jeu');
                }

                if (ownership.status !== 'owned') {
                    throw new Error('Ce jeu n\'est pas disponible à la vente');
                }

                if (!ownership.is_resellable) {
                    throw new Error('Ce jeu ne peut pas être revendu');
                }

                // Empêcher la revente des jeux .exe
                if (ownership.game_type === 'exe') {
                    throw new Error('Les jeux .exe ajoutés manuellement ne peuvent pas être revendus');
                }

                // UNIFIED SYSTEM: Update for_sale status directly
                await GameOwnership.updateOne(
                    { game_key: gameKey },
                    {
                        $set: {
                            for_sale: true,
                            asking_price: Number(price),
                            listed_at: new Date(),
                            status: 'listed_for_sale',
                            current_price: Number(price),
                            installed: false
                        }
                    }
                );

                return { message: 'Jeu mis en vente avec succès' };

            } catch (error) {
                console.error('Erreur lors de la vente du jeu:', error);
                throw error;
            }
        }

    // Annuler la vente d'un jeu
    async cancelSale(gameKey, userId) {
            try {
                const ownership = await GameOwnership.findOne({ game_key: gameKey }).lean();

                if (!ownership) {
                    throw new Error('Possession de jeu non trouvée');
                }

                const mongoose = require('mongoose');
                if (ownership.user_id.toString() !== userId.toString()) {
                    throw new Error('Non autorisé à annuler cette vente');
                }

                if (ownership.status !== 'listed_for_sale') {
                    throw new Error('Ce jeu n\'est pas en vente');
                }

                // UNIFIED SYSTEM: Remove for_sale status
                await GameOwnership.updateOne(
                    { game_key: gameKey },
                    {
                        $set: {
                            for_sale: false,
                            asking_price: null,
                            listed_at: null,
                            status: 'owned',
                            current_price: null
                        }
                    }
                );

                return { message: 'Vente annulée avec succès' };

            } catch (error) {
                console.error('Erreur lors de l\'annulation de la vente:', error);
                throw error;
            }
        }

        // Obtenir les statistiques de la blockchain
        getBlockchainStats() {
            return {
                totalBlocks: this.blockchain.chain.length,
                totalTransactions: this.blockchain.chain.reduce((total, block) => total + block.transactions.length, 0),
                pendingTransactions: this.blockchain.pendingTransactions.length,
                isChainValid: this.blockchain.isChainValid()
            };
        }

    // Réclamer un jeu avec une clé
    async redeemKey(userId, key) {
            try {
                if (!isValidKeyFormat(key)) {
                    throw new Error('Format de clé invalide');
                }

                const mongoose = require('mongoose');
                const keyObjId = new mongoose.Types.ObjectId(userId);

                // Vérifier si la clé existe et n'est pas utilisée
                const gameKey = await GameKey.findOne({ key, is_used: false }).lean();

                if (!gameKey) {
                    // Peut-être que la clé a été utilisée directement (ancien système)
                    const ownership = await GameOwnership.findOne({ game_key: key }).lean();
                    if (ownership) {
                        throw new Error('Cette clé a déjà été utilisée');
                    }
                    throw new Error('Clé invalide ou déjà utilisée');
                }

                // Vérifier si l'utilisateur possède déjà le jeu
                const existing = await GameOwnership.findOne({
                    user_id: keyObjId,
                    game_id: gameKey.game_id,
                    status: 'owned'
                }).lean();

                if (existing) {
                    throw new Error('Vous possédez déjà ce jeu');
                }

                const game = await Games.getGameById(gameKey.game_id.toString());
                if (!game) {
                    throw new Error('Jeu non trouvé');
                }

                // Créer la possession avec la clé comme token blockchain
                await GameOwnership.create({
                    user_id: keyObjId,
                    game_id: gameKey.game_id,
                    game_key: key, // game_key est le token blockchain
                    purchase_price: 0,
                    current_price: game.price || 0,
                    status: 'owned',
                    for_sale: false,
                    installed: false,
                    is_manual_add: true // Ajouté via clé externe, donc manuel
                });

                // Marquer la clé comme utilisée
                await GameKey.updateOne(
                    { _id: gameKey._id },
                    {
                        $set: {
                            is_used: true,
                            used_by: keyObjId,
                            used_at: new Date()
                        }
                    }
                );

                return {
                    success: true,
                    gameKey: key, // game_key est le token
                    game: {
                        id: game.id || gameKey.game_id.toString(),
                        name: game.name,
                        folder_name: game.folder_name
                    }
                };
            } catch (error) {
                console.error('Erreur lors de la réclamation de la clé :', error);
                throw error;
            }
        }

    // Générer des clés de jeu (pour devs/admin)
    async generateKeys(gameId, quantity, userId = null, purpose = 'dev') {
            try {
                const game = await Games.getGameById(gameId);
                if (!game) {
                    throw new Error('Jeu non trouvé');
                }

                const mongoose = require('mongoose');
                const keys = [];

                for (let i = 0; i < quantity; i++) {
                    let key = generateGameKey();
                    // S'assurer qu'elle est unique
                    let exists = await GameOwnership.findOne({ game_key: key }) || await GameKey.findOne({ key });
                    while (exists) {
                        key = generateGameKey();
                        exists = await GameOwnership.findOne({ game_key: key }) || await GameKey.findOne({ key });
                    }

                    const keyDoc = await GameKey.create({
                        game_id: new mongoose.Types.ObjectId(gameId),
                        key,
                        created_by: userId ? new mongoose.Types.ObjectId(userId) : null,
                        purpose,
                        is_used: false
                    });

                    keys.push({
                        id: keyDoc._id.toString(),
                        key,
                        purpose,
                        createdAt: keyDoc.created_at
                    });
                }

                return {
                    success: true,
                    game: {
                        id: game.id || gameId,
                        name: game.name
                    },
                    quantity: keys.length,
                    keys
                };
            } catch (error) {
                console.error('Erreur lors de la génération des clés :', error);
                throw error;
            }
        }

    // Ajouter un jeu manuellement avec une game_key externe (depuis un site externe)
    async addManualGame(userId, gameKey, gameData = {}) {
            try {
                if (!gameKey || typeof gameKey !== 'string' || gameKey.length < 10) {
                    throw new Error('Clé de jeu invalide');
                }

                // Vérifier si la clé est déjà utilisée
                const exists = await GameOwnership.findOne({ game_key: gameKey }).lean();
                if (exists) {
                    throw new Error('Cette clé de jeu est déjà utilisée');
                }

                const mongoose = require('mongoose');
                const userIdObj = new mongoose.Types.ObjectId(userId);

                // Créer une entrée de possession manuelle
                await GameOwnership.create({
                    user_id: userIdObj,
                    game_id: null, // Pas de lien direct avec un jeu de la base
                    game_key: gameKey,
                    purchase_price: 0,
                    current_price: 0,
                    status: 'owned',
                    for_sale: false,
                    installed: false,
                    is_manual_add: true,
                    game_type: 'exe', // Par défaut exe pour les jeux externes
                    exe_path: gameData.exe_path || null,
                    game_name: gameData.game_name || 'Jeu Externe',
                    game_description: gameData.description || 'Jeu ajouté manuellement'
                });

                return { success: true, message: 'Jeu ajouté manuellement avec succès' };
            } catch (error) {
                console.error('Erreur lors de l\'ajout manuel :', error);
                throw error;
            }
        }

    // Obtenir les clés générées (dev/admin)
    async getGeneratedKeys(gameId = null, userId = null, used = null) {
            try {
                const query = {};
                const mongoose = require('mongoose');

                if (gameId) {
                    query.game_id = new mongoose.Types.ObjectId(gameId);
                }

                if (userId) {
                    query.created_by = new mongoose.Types.ObjectId(userId);
                }

                if (used !== null) {
                    query.is_used = used;
                }

                const keys = await GameKey.find(query)
                    .sort({ created_at: -1 })
                    .populate('game_id', 'game_name')
                    .populate('used_by', 'username')
                    .lean();

                return keys.map(k => ({
                    id: k._id.toString(),
                    key: k.key,
                    game_name: k.game_id?.game_name,
                    purpose: k.purpose,
                    is_used: k.is_used,
                    used_by: k.used_by?.username,
                    used_at: k.used_at,
                    created_at: k.created_at
                }));
            } catch (error) {
                console.error('Erreur lors de la récupération des clés générées :', error);
                throw error;
            }
        }
    }

module.exports = new LibraryService();
