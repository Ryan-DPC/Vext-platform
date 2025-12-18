require('dotenv').config();
const http = require('http');
const app = require('./app');

const PORT = process.env.PORT || 5000;

const fs = require('fs');
const https = require('https');

let server;
// Only use HTTPS if explicitly enabled and keys are present
if (process.env.ENABLE_HTTPS === 'true' && process.env.SSL_KEY_PATH && process.env.SSL_CERT_PATH) {
    try {
        const httpsOptions = {
            key: fs.readFileSync(process.env.SSL_KEY_PATH),
            cert: fs.readFileSync(process.env.SSL_CERT_PATH)
        };
        server = https.createServer(httpsOptions, app);
        console.log('🔒 HTTPS Server enabled');
    } catch (error) {
        console.error('❌ Failed to load SSL certificates, falling back to HTTP:', error.message);
        server = http.createServer(app);
    }
} else {
    server = http.createServer(app);
}

// Connect to central WebSocket server (handled separately)
const { connectToCentralServer } = require('./socket/socket.server');
connectToCentralServer();

const logger = require('./utils/logger');

// ...

server.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
    logger.error(`Error: ${err.message}`);
    // Close server & exit process
    // server.close(() => process.exit(1));
});
