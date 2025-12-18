const Ajv = require("ajv");
const ajv = new Ajv();
const schema = require("../schemas/chat.schema");
const validate = ajv.compile(schema);
// const MessageModel = require('../models/chat.model'); // Keep existing model import if needed

const ChatModel = require('../models/chat.model');

class ChatHandler {
    constructor(io, socket) {
        this.io = io;
        this.socket = socket;
        this.userId = socket.userId;
        this.username = socket.username; // Ensure username is available
        this.init();
    }

    init() {
        // New spec event
        this.socket.on('chat:send-message', this.handleSend.bind(this));

        // Also listen to 'chat:send' if that's what the frontend uses (checking ChatPopup.vue)
        // ChatPopup.vue uses socketService.sendChatMessage which emits 'chat:send-message'
    }

    async handleSend(payload) {
        // Payload from frontend: { toUserId, content }
        // Schema validation might need adjustment if payload structure differs

        const { toUserId, content } = payload;
        const fromUserId = this.userId;

        console.log(`[chat.handler] Message from ${fromUserId} to ${toUserId}:`, content);

        try {
            // Save to DB
            const newMessage = await ChatModel.create({
                from_user: fromUserId,
                to_user: toUserId,
                content: content,
                read_at: null
            });

            // Prepare message object for client
            const messageForRecipient = {
                id: newMessage._id,
                content: newMessage.content,
                from_user_id: newMessage.from_user,
                to_user_id: newMessage.to_user,
                created_at: newMessage.created_at,
                from_username: this.username, // Optional, helpful for notifications
                is_from_me: false
            };

            const messageForSender = {
                ...messageForRecipient,
                is_from_me: true
            };

            // Emit to recipient
            this.io.to(`user:${toUserId}`).emit("chat:message-received", messageForRecipient);

            // Emit confirmation to sender (optional, but good for UI update if not optimistic)
            // this.socket.emit("chat:message-sent", messageForSender);

        } catch (error) {
            console.error('[chat.handler] Error saving message:', error);
            this.socket.emit('error', { message: 'Failed to send message' });
        }
    }
}

module.exports = (io, socket) => {
    new ChatHandler(io, socket);
};
