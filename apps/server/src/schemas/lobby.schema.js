module.exports = {
    type: "object",
    properties: {
        userId: { type: "string", minLength: 1 },
        lobbyId: { type: "string", minLength: 1 }
    },
    required: ["userId", "lobbyId"],
    additionalProperties: false
};
