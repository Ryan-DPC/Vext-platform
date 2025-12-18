const { io } = require('socket.io-client');
const socketHandlers = require('./socket.handlers');

let centralSocket;

const connectToCentralServer = () => {
    if (centralSocket) return centralSocket;

    const centralServerUrl = process.env.CENTRAL_WEBSOCKET_URL || process.env.WS_URL;

    if (!centralServerUrl) {
        console.error('CENTRAL_WEBSOCKET_URL is not defined in environment variables');
        return;
    }

    console.log(`Connecting to central WebSocket server at ${centralServerUrl}...`);

    centralSocket = io(centralServerUrl, {
        reconnection: true,
        reconnectionDelay: 10000, // Start with 10 seconds
        reconnectionDelayMax: 60000, // Max 60 seconds
        reconnectionAttempts: Infinity,
        transports: ['websocket'],
        randomizationFactor: 0.1, // Reduce randomization to ensure minimum delay
        auth: {
            token: process.env.WS_CENTRAL_TOKEN // Add authentication token
        },
        extraHeaders: {
            "User-Agent": "EtherBackend/1.0",
            "Origin": "https://backend-ether.onrender.com" // Use Backend URL or legitimate origin
        }
    });

    centralSocket.on('connect', () => {
        console.log(`Connected to central WebSocket server: ${centralSocket.id}`);

        // Initialize handlers for this client socket
        socketHandlers(centralSocket);
    });

    centralSocket.on('disconnect', (reason) => {
        console.log(`Disconnected from central WebSocket server: ${reason}`);
    });

    centralSocket.on('connect_error', (error) => {
        console.error('Connection error to central WebSocket server:', error.message);
        console.error('Socket URL:', centralServerUrl);
        if (error.description) console.error('Error description:', error.description);
        if (error.context) console.error('Error context:', error.context);
    });

    return centralSocket;
};

const getCentralSocket = () => {
    if (!centralSocket) {
        throw new Error('Central WebSocket client not initialized!');
    }
    return centralSocket;
};

module.exports = { connectToCentralServer, getCentralSocket };

