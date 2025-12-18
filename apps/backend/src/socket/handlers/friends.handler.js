const Users = require('../../features/users/user.model');

module.exports = (socket) => {
    // User joins (set status) 
    socket.on('user:status-update', async (data) => {
        try {
            const { status, lobbyId } = data;
            const userId = socket.userId; // Assuming set during auth

            if (!userId) return;

            // Send to central server to broadcast to friends
            socket.emit('friend:status-changed:broadcast', {
                userId,
                status,
                lobbyId
            });

            console.log(`[Socket] User ${userId} status: ${status}${lobbyId ? ` (lobby: ${lobbyId})` : ''}`);
        } catch (error) {
            console.error('[Socket] Error updating status:', error);
        }
    });

    // Friend request sent notification
    socket.on('friend:request-sent', (data) => {
        const { toUserId } = data;

        // Forward to central server to deliver to recipient
        socket.emit('friend:request-received:forward', { toUserId });
    });

    // Friend request accepted notification
    socket.on('friend:request-accepted-notification', (data) => {
        const { toUserId } = data;

        // Forward to central server to deliver to recipient
        socket.emit('friend:request-accepted:forward', { toUserId });
    });
};

