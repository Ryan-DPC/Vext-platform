module.exports = {
    type: "object",
    properties: {
        recipientId: { type: "string", minLength: 1 },
        content: { type: "string", minLength: 1, maxLength: 2000 }
    },
    required: ["recipientId", "content"],
    additionalProperties: false
};
