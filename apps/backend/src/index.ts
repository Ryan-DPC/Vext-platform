import { Elysia } from 'elysia';
import dotenv from 'dotenv';
dotenv.config(); // Load environment variables first

import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { connectDB } from './config/db';
import { authRoutes } from './features/auth/auth.routes';
import { usersRoutes } from './features/users/users.routes';
import { gamesRoutes } from './features/games/games.routes';
import { friendsRoutes } from './features/friends/friends.routes';
import { libraryRoutes } from './features/library/library.routes';
import { stickArenaRoutes } from './features/stick-arena/stick-arena.routes';
import { chatRoutes } from './features/chat/chat.routes';
import { itemsRoutes } from './features/items/items.routes';
import { financeRoutes } from './features/finance/finance.routes';
import { lobbyRoutes } from './features/lobby/lobby.routes';
import { gameCategoriesRoutes } from './features/game-categories/game-categories.routes';
import { gameOwnershipRoutes } from './features/game-ownership/game-ownership.routes';
import { reviewsRoutes } from './features/reviews/reviews.routes';
import { statsRoutes } from './features/stats/stats.routes';
import { devGamesRoutes } from './features/dev-games/dev-games.routes';
import { adminRoutes } from './features/admin/admin.routes';
import { groupsRoutes } from './features/groups/groups.routes';
import { installationRoutes } from './features/installation/installation.routes';
import { setWebSocketServer } from './services/websocket.service';
import { logger } from './utils/logger';
import { handleStickArenaMessage, handleStickArenaDisconnect } from './features/stick-arena/stick-arena.socket';
import { handleAetherStrikeMessage, handleAetherStrikeDisconnect } from './features/aether-strike/aether-strike.socket';
import { FriendsService } from './features/friends/friends.service';
import { jwt } from '@elysiajs/jwt';

// WebSocket Data Interface
interface WebSocketData {
  userId?: string;
  username?: string;
  authenticated?: boolean;
  stickArenaRoomId?: string;
  aetherGameId?: string;
  query?: {
    token?: string;
  };
}

// Connect Database
await connectDB();

// Start Redis Cleanup Job (runs daily at 3AM)
import './jobs/redis-cleanup.job';

import { staticPlugin } from '@elysiajs/static';

const app = new Elysia()
  .use(
    staticPlugin({
      assets: 'public',
      prefix: '/public',
    })
  )
  .use(cors())
  .use(swagger())
  .onRequest(({ request, store }) => {
    (store as any).startTime = performance.now();
  })
  .onAfterHandle(({ request, set, store }) => {
    const start = (store as any).startTime;
    if (start) {
      const duration = performance.now() - start;
      const method = request.method;
      const url = new URL(request.url).pathname;
      const status = set.status || 200;

      const logMsg = `[${method}] ${url} - ${status} - ${duration.toFixed(2)}ms`;

      if (duration > 200) {
        logger.warn(`Slow Request: ${logMsg}`);
      } else {
        logger.http(logMsg);
      }
    }
  })
  .get('/', () => ({
    success: true,
    message: 'VEXT Backend (Elysia + Native WS) is running',
    version: '1.0.0',
  }))
  .get('/health', () => ({
    status: 'ok',
    uptime: process.uptime(),
  }))
  // HTTP Routes
  .use(authRoutes)
  .use(usersRoutes)
  .use(gamesRoutes)
  .use(friendsRoutes)
  .use(libraryRoutes)
  .use(stickArenaRoutes)
  .use(chatRoutes)
  .use(itemsRoutes)
  .use(financeRoutes)
  .use(lobbyRoutes)
  .use(gameCategoriesRoutes)
  .use(gameOwnershipRoutes)
  .use(reviewsRoutes)
  .use(statsRoutes)
  .use(devGamesRoutes)
  .use(adminRoutes)
  .use(groupsRoutes)
  .use(installationRoutes)

  // WebSocket Handler
  // @ts-ignore - Elysia WebSocket ts.data dynamic properties
  .ws('/ws', {
    async open(ws: any) {
      logger.info('[WebSocket] New connection opened');

      // Try to authenticate from query parameter
      const token = ws.data?.query?.token;

      if (token) {
        try {
          const jwtInstance = jwt({
            name: 'jwt',
            secret: process.env.JWT_SECRET || 'default_secret',
          });
          const payload = await jwtInstance.decorator.jwt.verify(token);

          if (payload) {
            ws.data.userId = (payload as any).id;
            ws.data.username = (payload as any).username;
            ws.data.authenticated = true;

            // Subscribe to user's personal channel
            ws.subscribe(`user:${ws.data.userId}`);

            logger.info(`[WebSocket] User auto-authenticated: ${ws.data.username} (${ws.data.userId})`);
            ws.send(JSON.stringify({ type: 'auth:success', data: { userId: ws.data.userId } }));
          }
        } catch (err) {
          logger.error('[WebSocket] Auto-auth failed:', err);
          ws.data.authenticated = false;
        }
      } else {
        ws.data.authenticated = false;
      }
    },

    async message(ws: any, message: any) {
      try {
        // Parse message
        let parsed: any;
        if (typeof message === 'string') {
          parsed = JSON.parse(message);
        } else {
          parsed = message;
        }

        const { type, data } = parsed;

        // Handle authentication
        if (type === 'auth' && data?.token) {
          try {
            const jwtInstance = jwt({
              name: 'jwt',
              secret: process.env.JWT_SECRET || 'default_secret',
            });
            const payload = await jwtInstance.decorator.jwt.verify(data.token);

            if (payload) {
              ws.data.userId = (payload as any).id;
              ws.data.username = (payload as any).username;
              ws.data.authenticated = true;

              // Subscribe to user's personal channel
              ws.subscribe(`user:${ws.data.userId}`);

              logger.info(`[WebSocket] User authenticated: ${ws.data.username} (${ws.data.userId})`);
              ws.send(JSON.stringify({ type: 'auth:success', data: { userId: ws.data.userId } }));
            }
          } catch (err) {
            logger.error('[WebSocket] Auth failed:', err);
            ws.send(JSON.stringify({ type: 'auth:failed', data: { error: 'Invalid token' } }));
          }
          return;
        }

        // Require authentication for other messages
        if (!ws.data.authenticated) {
          ws.send(JSON.stringify({ type: 'error', data: { message: 'Not authenticated' } }));
          return;
        }

        // Handle user status updates
        if (type === 'user:status-update') {
          const { status, lobbyId } = data;
          logger.info(`[WebSocket] Status update from ${ws.data.username}: ${status}`);

          // Get user's friends and broadcast to them
          const friends = await FriendsService.getFriends(ws.data.userId);

          for (const friend of friends) {
            const friendUserId = friend.friend_id?.toString();
            if (friendUserId) {
              // Publish to friend's personal channel
              ws.publish(`user:${friendUserId}`, JSON.stringify({
                type: 'friend:status-changed',
                data: {
                  userId: ws.data.userId,
                  username: ws.data.username,
                  status,
                  lobbyId
                }
              }));
            }
          }
          return;
        }

        // Handle private chat messages
        if (type === 'chat:send-message') {
          const { toUserId, content } = data;
          logger.info(`[WebSocket] Chat message from ${ws.data.username} to ${toUserId}`);

          try {
            // Import ChatService dynamically to avoid circular deps
            const { ChatService } = await import('./features/chat/chat.service');

            // Save to database
            const message = await ChatService.sendMessage(ws.data.userId, toUserId, content);

            // Notify recipient in real-time
            ws.publish(`user:${toUserId}`, JSON.stringify({
              type: 'chat:new-message',
              data: {
                id: message._id || message.id,
                from_user_id: ws.data.userId,
                from_username: ws.data.username,
                content,
                created_at: new Date(),
                is_from_me: false
              }
            }));

            // Confirm to sender
            ws.send(JSON.stringify({
              type: 'chat:message-sent',
              data: { messageId: message._id || message.id }
            }));

          } catch (error) {
            logger.error('[WebSocket] Chat message error:', error);
            ws.send(JSON.stringify({
              type: 'chat:error',
              data: { error: 'Failed to send message' }
            }));
          }
          return;
        }

        // Handle Stick Arena messages
        if (type?.startsWith('stick-arena:')) {
          await handleStickArenaMessage(ws, type, data);
          return;
        }

        // Handle Aether Strike messages
        if (type?.startsWith('aether-strike:')) {
          await handleAetherStrikeMessage(ws, type, data);
          return;
        }

        // Handle other message types...
        logger.warn(`[WebSocket] Unhandled message type: ${type}`);

      } catch (error) {
        logger.error('[WebSocket] Message handling error:', error);
      }
    },

    close(ws: any) {
      logger.info(`[WebSocket] Connection closed for user: ${ws.data.username || 'anonymous'}`);

      // Clean up Stick Arena if needed
      if (ws.data.stickArenaRoomId) {
        handleStickArenaDisconnect(ws);
      }

      // Clean up Aether Strike if needed
      if (ws.data.aetherGameId) {
        handleAetherStrikeDisconnect(ws);
      }
    }
  })

  .listen(process.env.PORT || 3000);

// Initialize Global WebSocket Server Reference
if (app.server) {
  setWebSocketServer(app.server);
  logger.info(
    `🦊 VEXT Backend (REST) is running at ${app.server.hostname}:${app.server.port} (with Native WebSockets)`
  );
} else {
  logger.error('Failed to start Elysia server');
}
