const userHandler = require('./handlers/user.handler');
const lobbyHandler = require('./handlers/lobby.handler');
const friendsHandler = require('./handlers/friends.handler');
// stickArenaHandler logic removed as it belongs to the standalone WebSocket server
// const stickArenaHandler = require('../features/stick-arena/stick-arena.socket');

module.exports = (socket) => {
    // Register handlers with the central socket client
    userHandler(socket);
    lobbyHandler(socket);
    friendsHandler(socket);
    // stickArenaHandler(socket);

    // Add other handlers here (e.g. chat, game specific events)
};

