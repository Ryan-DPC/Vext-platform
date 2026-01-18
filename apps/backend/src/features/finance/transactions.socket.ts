
import { WebSocketService } from '../../services/websocket.service';
import { FinanceService } from './finance.service';

export const handleTransactionMessage = async (ws: any, type: string, payload: any) => {
    switch (type) {
        case 'transaction:purchase':
            const { ownershipToken, sellerId } = payload;
            const buyerId = ws.data.userId;

            console.log(`[Transaction] Purchase request from ${buyerId}`);

            try {
                const result = await FinanceService.purchaseUsedGame(buyerId, ownershipToken, sellerId);

                // Emit success to buyer
                ws.send(JSON.stringify({
                    type: 'transaction:success',
                    data: {
                        message: 'Purchase successful',
                        game: result.game,
                        // newBalance: result.newBalance // Service doesn't return new balance currently, might need to fetch or adjust service.
                        // For now, let frontend re-fetch profile.
                    }
                }));

                // Notify seller
                ws.publish(`user:${sellerId}`, JSON.stringify({
                    type: 'transaction:seller_notification',
                    data: {
                        message: `Your copy of ${result.game.game_name} was sold!`,
                        amount: result.sellerReceives,
                        gameName: result.game.game_name
                    }
                }));

            } catch (error: any) {
                console.error('[Transaction] Error:', error);
                ws.send(JSON.stringify({ type: 'transaction:error', message: error.message }));
            }
            break;
    }
};
