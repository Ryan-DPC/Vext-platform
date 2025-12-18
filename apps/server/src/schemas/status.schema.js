module.exports = {
    type: "object",
    properties: {
        status: { type: "string", enum: ["online", "offline", "in-game"] }
    },
    required: ["status"],
    additionalProperties: false
};
