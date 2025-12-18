const UsersService = require('../services/users.service');

const isValidName = (name) => /^[a-zA-Z0-9_]{3,20}$/.test(name.trim());

module.exports = (io, socket) => {
    // Récupérer l'utilisateur associé au socketId si défini
    const checkUser = async () => {
        try {
            const user = await UsersService.getUserBySocketId(socket.id);
            if (user && user.username) {
                socket.data.name = user.username;
                console.log(`Reconnected user: ${socket.data.name}`);
            }
        } catch (error) {
            console.error(`Error fetching user by socket ID: ${error.message}`);
        }
    };
    checkUser();

    // Associer un nom utilisateur au socket
    socket.on('setName', async (name) => {
        if (!name || !isValidName(name)) {
            socket.emit('error', { message: 'Invalid username. Only alphanumeric characters and underscores, 3-20 characters allowed.' });
            return;
        }

        socket.data.name = name.trim();
        try {
            // UsersService.saveSocketId handled in index.js on connection
            // await UsersService.saveSocketId(socket.id, socket.data.name);
            console.log(`User set their name: ${socket.data.name}`);
            socket.emit('nameSet', { name: socket.data.name });
        } catch (error) {
            console.error(`Error saving socketId: ${error.message}`);
            socket.emit('error', { message: 'Failed to save user name.' });
        }
    });

    // Déconnexion (nettoyage utilisateur)
    socket.on('disconnect', async () => {
        try {
            // Handled in index.js
            // await UsersService.removeSocketId(socket.id);
            // console.log(`Socket ID ${socket.id} removed from database.`);
        } catch (error) {
            console.error(`Error removing socketId: ${error.message}`);
        }
        console.log(`User disconnected: ${socket.data.name || socket.id}`);
    });
};
