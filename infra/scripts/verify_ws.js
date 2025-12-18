const { io } = require('socket.io-client');

const url = 'https://server-1-z9ok.onrender.com';
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJiYWNrZW5kLXNlcnZpY2UiLCJ1c2VybmFtZSI6IkJhY2tlbmQgU2VydmljZSIsInJvbGUiOiJzZXJ2aWNlIiwiaWF0IjoxNzY1OTE4NDY0LCJleHAiOjQ5MjE2Nzg0NjR9.JoG5E3qyqdt4dX1LpC9iq8es0OwNmGjy0WXvLE82dFM'; // From .env.backend

console.log(`Checking WebSocket connection to: ${url}`);

const socket = io(url, {
    transports: ['websocket'],
    auth: {
        token: token
    },
    extraHeaders: {
        "User-Agent": "Ethertest/1.0"
    }
});

socket.on('connect', () => {
    console.log('✅ Connected to WebSocket Server successfully!');
    console.log(`Socket ID: ${socket.id}`);
    socket.disconnect();
});

socket.on('connect_error', (err) => {
    console.error(`❌ Connection Error: ${err.message}`);
    if (err.description) {
        // Log the full error object if possible
        console.error('Error Description:', err.description);
    }
    // Check for 429 status code in error object context if available
    // socket.io-client error from XHR request often has 'statusCode' or context
    socket.disconnect();
});

socket.on('disconnect', (reason) => {
    console.log(`Disconnected: ${reason}`);
});
