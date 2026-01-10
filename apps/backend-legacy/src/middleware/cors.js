const cors = require('cors');

// Allowed origins for CORS
const allowedOrigins = [
    'http://localhost:5173',  // Vite dev server
    'http://localhost:3000',  // Alternative dev port
    'tauri://localhost',      // Tauri production build
    'file://',                // Electron app
    process.env.FRONTEND_URL  // Production frontend
].filter(Boolean);

module.exports = cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like Electron file:// or curl)
        if (!origin) {
            return callback(null, true);
        }

        // Check if origin is in allowed list
        if (allowedOrigins.some(allowed => origin.startsWith(allowed) || allowed === origin)) {
            return callback(null, true);
        }

        // In development, allow all localhost and tauri origins
        if (origin.includes('localhost') || origin.includes('127.0.0.1') || origin.startsWith('tauri://')) {
            return callback(null, true);
        }

        callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'X-Requested-With', 'Accept', 'Origin'],
    credentials: true
});
