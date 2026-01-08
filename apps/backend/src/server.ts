import app from './app';
// @ts-ignore
import { Server } from 'socket.io';
import http from 'http';
import dotenv from 'dotenv';
// @ts-ignore
import { attachWebSocketBridge } from './features/ws-bridge/ws-bridge.socket';

dotenv.config();

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

// Initialize Socket.io (Legacy/Local usage, prefer Central Server)
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Attach WebSocket Handlers
attachWebSocketBridge(io);

// Clean error handling for server
process.on('uncaughtException', (err: Error) => {
    console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
    console.error(err.name, err.message);
    process.exit(1);
});

server.listen(PORT, () => {
    console.log(`
    ################################################
    🛡️  Server listening on port: ${PORT} 🛡️ 
    ################################################
    `);
});

process.on('unhandledRejection', (err: any) => {
    console.error('UNHANDLED REJECTION! 💥 Shutting down...');
    console.error(err.name, err.message);
    server.close(() => {
        process.exit(1);
    });
});
