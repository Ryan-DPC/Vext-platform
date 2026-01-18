
import { WebSocketService } from '../../services/websocket.service';
import { GroupsService } from './groups.service';
import { Users } from '@vext/database'; // Or correct path

export const handleGroupMessage = async (ws: any, type: string, payload: any) => {
    const userId = ws.data.userId;
    const username = ws.data.username;

    switch (type) {
        case 'group:join':
            const { groupId } = payload;
            console.log(`[Group] User ${username} joining group ${groupId}`);

            try {
                // Verify user is a member
                const group = await GroupsService.getGroup(groupId, userId);

                // Subscribe to group topic
                ws.subscribe(`group:${groupId}`);

                // Notify user of successful join
                ws.send(
                    JSON.stringify({
                        type: 'group:joined',
                        data: { groupId, group },
                    })
                );

                // Notify other members
                ws.publish(`group:${groupId}`, JSON.stringify({
                    type: 'group:member-online',
                    data: { userId, username }
                }));

            } catch (error: any) {
                console.error('[Group] Join error:', error);
                ws.send(
                    JSON.stringify({
                        type: 'error',
                        data: { message: error.message },
                    })
                );
            }
            break;

        case 'group:send-message':
            const { groupId: msgGroupId, content } = payload;

            if (!content || !msgGroupId) {
                ws.send(
                    JSON.stringify({
                        type: 'error',
                        data: { message: 'Group ID and content are required' },
                    })
                );
                return;
            }

            console.log(`[Group] Message from ${username} in group ${msgGroupId}:`, content);

            try {
                // Save message to DB
                const message = await GroupsService.sendMessage(msgGroupId, userId, content);

                // Populate user info for broadcast (Mock or Fetch)
                // GroupsService.sendMessage returns the message doc.
                // We need formatting similar to what frontend expects.

                const messagePayload = {
                    id: message._id.toString(),
                    group_id: msgGroupId,
                    user: {
                        id: userId,
                        username: username,
                        // profile_pic? We might need to fetch if not in session, or assume client has it.
                        // For now, minimal.
                    },
                    content: message.content,
                    created_at: message.created_at,
                };

                ws.publish(`group:${msgGroupId}`, JSON.stringify({
                    type: 'group:message-received',
                    data: messagePayload
                }));

            } catch (error: any) {
                console.error('[Group] Send message error:', error);
                ws.send(
                    JSON.stringify({
                        type: 'error',
                        data: { message: error.message },
                    })
                );
            }
            break;

        case 'group:leave':
            const { groupId: leaveGroupId } = payload;
            console.log(`[Group] User ${username} leaving group ${leaveGroupId}`);

            try {
                ws.unsubscribe(`group:${leaveGroupId}`);

                ws.publish(`group:${leaveGroupId}`, JSON.stringify({
                    type: 'group:member-offline',
                    data: { userId, username }
                }));

                ws.send(
                    JSON.stringify({
                        type: 'group:left',
                        data: { groupId: leaveGroupId },
                    })
                );
            } catch (error: any) {
                console.error('[Group] Leave error:', error);
            }
            break;
    }
};
