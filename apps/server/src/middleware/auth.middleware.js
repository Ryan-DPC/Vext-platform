const jwt = require('jsonwebtoken');

module.exports = (socket, next) => {
    try {
        const token = socket.handshake.auth?.token;
        if (!token) {
            console.log('[auth.middleware] No token provided, rejecting connection');
            const err = new Error("Authentication error");
            err.data = { content: "No token provided" };
            return next(err);
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Attach user info to socket
        // Normalize to socket.user as per my previous implementation plan, or keep socket.userId?
        // Existing code uses socket.userId. I will keep socket.userId AND socket.user for compatibility.
        socket.userId = decoded.userId || decoded.id;
        socket.username = decoded.username;
        socket.user = { id: socket.userId, username: socket.username };

        console.log(`[auth.middleware] ✅ User authenticated: ${socket.userId} (${socket.username})`);

        next();
    } catch (error) {
        console.log('[auth.middleware] ❌ Authentication failed:', error.message);
        const err = new Error("Authentication error");
        err.data = { content: "Invalid token" };
        next(err);
    }
};
