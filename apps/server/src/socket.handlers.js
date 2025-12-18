const userHandler = require('./handlers/user.handler');
const friendsHandler = require('./handlers/friends.handler');
const lobbyHandler = require('./handlers/lobby.handler');
const chatHandler = require('./handlers/chat.handler');

const stickHandler = require('./features/stick-arena/stick-arena.socket');

module.exports = (io, socket) => {
    const role = process.env.SERVER_ROLE || 'launcher';
    console.log(`[socket.handlers] Registering handlers for socket ${socket.id} (Role: ${role})`);

    if (role === 'games') {
        // Dedicated Game Server
        stickHandler(socket);
        console.log(`[socket.handlers] Registered GAME handlers for user ${socket.userId}`);
    } else {
        // Default Launcher/Social Server
        userHandler(io, socket);
        friendsHandler(io, socket);
        lobbyHandler(io, socket);
        chatHandler(io, socket);
        require('./handlers/transaction.handler')(io, socket);
        console.log(`[socket.handlers] Registered LAUNCHER handlers for user ${socket.userId}`);
    }
};
