import { WebSocketService } from '../services/websocket.service';
import { UsersService } from '../services/users.service';

export const handleFriendsMessage = async (ws: any, type: string, payload: any) => {
  switch (type) {
    case 'status:update': {
      // Validation
      const status = payload?.status;
      if (!status) return;

      const userId = ws.data.userId;
      const activity = payload?.activity || null;
      console.log(
        `[presence] User ${userId} status: ${status}`,
        activity ? `(${activity.game})` : ''
      );

      // Broadcast to all friends
      try {
        const friends = await UsersService.getFriends(userId);
        friends.forEach((friend: any) => {
          WebSocketService.publish(`user:${friend.id}`, 'friend:status-changed', {
            userId: userId,
            status: status,
            lobbyId: payload?.lobbyId,
            activity: activity,
          });
        });
      } catch (err) {
        console.error('Error broadcasting status:', err);
      }
      break;
    }

    case 'user:status-update': {
      // Legacy support - call status:update logic
      await handleFriendsMessage(ws, 'status:update', payload);
      break;
    }
  }
};
