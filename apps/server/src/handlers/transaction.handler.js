const Users = require('../models/user.model');
const GameOwnership = require('../models/game-ownership.model');
const BlockchainTx = require('../models/blockchain-tx.model');
const etherBlockchain = require('../services/blockchain.instance');
const { Transaction } = require('../services/blockchain.service');

module.exports = (io, socket) => {
    const purchaseUsedGame = async (payload) => {
        const { ownershipToken, sellerId } = payload;
        const buyerId = socket.userId;

        console.log(`[Transaction] Purchase request from ${buyerId} for token ${ownershipToken}`);

        try {
            if (!ownershipToken || !sellerId) {
                throw new Error('ownershipToken and sellerId are required');
            }

            // Find the listing
            const listing = await GameOwnership.findOne({
                ownership_token: ownershipToken,
                user_id: sellerId,
                for_sale: true
            });

            if (!listing) {
                throw new Error('Listing not found or no longer available');
            }

            // Check if buyer already owns this game
            const alreadyOwns = await GameOwnership.findOne({
                user_id: buyerId,
                game_key: listing.game_key
            });

            if (alreadyOwns) {
                throw new Error('You already own this game');
            }

            const salePrice = listing.asking_price;
            const platformFee = salePrice * 0.05; // 5%
            const developerFee = salePrice * 0.02; // 2%
            const sellerReceives = salePrice - platformFee - developerFee;

            // Get buyer and seller
            const buyer = await Users.getUserById(buyerId);
            const seller = await Users.getUserById(sellerId);

            if (!buyer || !seller) {
                throw new Error('User not found');
            }

            // Check buyer has enough balance
            if (buyer.balances.chf < salePrice) {
                throw new Error('Insufficient balance');
            }

            // Transfer funds
            await Users.decrementBalance(buyerId, 'CHF', salePrice);
            await Users.incrementBalance(sellerId, 'CHF', sellerReceives);

            // Transfer ownership
            listing.user_id = buyerId;
            listing.for_sale = false;
            listing.asking_price = null;
            listing.listed_at = null;
            listing.purchase_price = salePrice;
            listing.purchase_date = new Date();
            listing.installed = false;
            await listing.save();

            // Record transaction in Blockchain
            try {
                // 1. Transaction: Buyer -> Seller (Net Amount)
                const txToSeller = new Transaction(buyerId, sellerId, sellerReceives, 'game_sale', listing.game_key);
                etherBlockchain.createTransaction(txToSeller);

                // Save to persistent DB
                await BlockchainTx.create({
                    transaction_id: txToSeller.transactionId,
                    from_address: buyerId,
                    to_address: sellerId,
                    amount: sellerReceives,
                    transaction_type: 'game_sale',
                    game_id: listing.game_id,
                    game_key: listing.game_key,
                    ownership_token: listing.ownership_token
                });

                // 2. Transaction: Buyer -> Platform (Fee)
                const txToPlatform = new Transaction(buyerId, 'PLATFORM_WALLET', platformFee, 'commission', listing.game_key);
                etherBlockchain.createTransaction(txToPlatform);

                // 3. Transaction: Buyer -> Developer (Fee)
                const txToDev = new Transaction(buyerId, 'DEVELOPER_WALLET', developerFee, 'commission', listing.game_key);
                etherBlockchain.createTransaction(txToDev);

                // Mine the block immediately for this simulation
                etherBlockchain.minePendingTransactions('MINER_WALLET');

                console.log(`[Blockchain] Recorded sale of ${listing.game_name}`);
            } catch (bcError) {
                console.error('[Blockchain] Failed to record transaction:', bcError);
            }

            // Emit success to buyer
            socket.emit('transaction:success', {
                message: 'Purchase successful',
                game: listing,
                newBalance: buyer.balances.chf - salePrice
            });

            // Notify seller if online
            // Use socket_id from the new model
            // Also emit to the user room just in case
            if (seller.socket_id) {
                io.to(seller.socket_id).emit('transaction:seller_notification', {
                    message: `Your copy of ${listing.game_name} was sold!`,
                    amount: sellerReceives,
                    gameName: listing.game_name
                });
            } else {
                io.to(`user:${sellerId}`).emit('transaction:seller_notification', {
                    message: `Your copy of ${listing.game_name} was sold!`,
                    amount: sellerReceives,
                    gameName: listing.game_name
                });
            }

        } catch (error) {
            console.error('[Transaction] Error:', error);
            socket.emit('transaction:error', { message: error.message });
        }
    };

    socket.on('transaction:purchase', purchaseUsedGame);
};
