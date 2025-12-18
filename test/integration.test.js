const path = require("path");
const { io } = require(path.join(__dirname, "../server/node_modules/socket.io-client"));
const jwt = require(path.join(__dirname, "../server/node_modules/jsonwebtoken"));
const { spawn } = require("child_process");

const PORT = 4001;
const SECRET = "test_secret";
const SERVER_URL = `http://localhost:${PORT}`;

let serverProcess;

function startServer() {
    return new Promise((resolve, reject) => {
        const serverPath = path.join(__dirname, "../server/index.js");
        const env = {
            ...process.env,
            WS_PORT: PORT,
            JWT_SECRET: SECRET,
            DISABLE_REDIS_ADAPTER: "true"
            // Use a test DB or existing one.
        };

        serverProcess = spawn("node", [serverPath], { env, stdio: 'pipe' });

        serverProcess.stdout.on('data', (data) => {
            const output = data.toString();
            console.log(`[SERVER] ${output.trim()}`);
            if (output.includes(`WebSocket server running on port ${PORT}`)) {
                resolve();
            }
        });

        serverProcess.stderr.on('data', (data) => {
            console.error(`[SERVER ERROR] ${data.toString().trim()}`);
        });

        serverProcess.on('error', (err) => {
            reject(err);
        });
    });
}

function createClient(token) {
    const opts = {
        transports: ["websocket"],
        forceNew: true
    };
    if (token) {
        opts.auth = { token };
    }
    return io(SERVER_URL, opts);
}

function waitForEvent(client, event, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            client.off(event, listener);
            reject(new Error(`Timeout waiting for event '${event}'`));
        }, timeout);

        const listener = (data) => {
            clearTimeout(timer);
            client.off(event, listener);
            resolve(data);
        };

        client.on(event, listener);
    });
}

async function runTests() {
    try {
        console.log("Starting server...");
        await startServer();
        console.log("Server started.");

        // --- Test 1: Auth Failure ---
        console.log("\nTest 1: Auth Failure...");
        await new Promise((resolve, reject) => {
            const client = createClient(null);
            client.on("connect_error", (err) => {
                if (err.message === "Authentication error") {
                    console.log("✅ Auth failure verified");
                    client.close();
                    resolve();
                } else {
                    reject(new Error(`Unexpected error: ${err.message}`));
                }
            });
            client.on("connect", () => {
                reject(new Error("Should not connect without token"));
                client.close();
            });
            setTimeout(() => reject(new Error("Timeout waiting for auth failure")), 2000);
        });

        // --- Setup Clients for Interaction Tests ---
        // Use valid ObjectIds to avoid CastErrors in server logs/logic
        const user1Id = "507f1f77bcf86cd799439011";
        const user2Id = "507f1f77bcf86cd799439012";

        const token1 = jwt.sign({ userId: user1Id, username: "user1" }, SECRET);
        const token2 = jwt.sign({ userId: user2Id, username: "user2" }, SECRET);

        const client1 = createClient(token1);
        const client2 = createClient(token2);

        await Promise.all([
            waitForEvent(client1, "connect"),
            waitForEvent(client2, "connect")
        ]);
        console.log("\n✅ Clients connected");

        // --- Test 2: Set Name ---
        console.log("\nTest 2: Set Name...");
        client1.emit("setName", "PlayerOne");
        const nameData = await waitForEvent(client1, "nameSet");
        if (nameData.name === "PlayerOne") {
            console.log("✅ Name set verified");
        } else {
            throw new Error("Name set failed");
        }

        // --- Test 3: Lobby Creation & Join ---
        console.log("\nTest 3: Lobby Creation & Join...");
        client1.emit("createGame");
        const gameData = await waitForEvent(client1, "gameCreated");
        const gameCode = gameData.code;
        console.log(`   Game created with code: ${gameCode}`);

        // Client 2 needs a name to join
        client2.emit("setName", "PlayerTwo");
        await waitForEvent(client2, "nameSet");

        client2.emit("joinGame", gameCode);

        // Both should receive playerJoined
        const joinData = await waitForEvent(client1, "playerJoined");
        if (joinData.player === "PlayerTwo" && joinData.code === gameCode) {
            console.log("✅ Lobby join verified");
        } else {
            throw new Error("Lobby join failed");
        }

        // --- Test 4: Lobby Invite ---
        console.log("\nTest 4: Lobby Invite...");
        // Client 1 invites Client 2 to a different lobby (or same, just testing the event)
        const invitePayload = { userId: user2Id, lobbyId: gameCode };
        client1.emit("lobby:invite", invitePayload);

        const inviteData = await waitForEvent(client2, "lobby:invite-received");
        if (inviteData.lobbyId === gameCode && inviteData.fromUser.username === "PlayerOne") {
            console.log("✅ Lobby invite verified");
        } else {
            throw new Error("Lobby invite failed");
        }

        // --- Test 5: Chat ---
        console.log("\nTest 5: Chat...");
        const chatMsg = "Hello User 2!";
        client1.emit("chat:send-message", { toUserId: user2Id, content: chatMsg });

        const chatData = await waitForEvent(client2, "chat:message-received");
        if (chatData.content === chatMsg && chatData.from_username === "user1") { // Username from token/socket, might be "user1" or "PlayerOne" depending on how handler sets it.
            // Handler uses this.username = socket.username (from token).
            // Token has "user1".
            console.log("✅ Chat message verified");
        } else {
            console.log("Received:", chatData);
            throw new Error("Chat message failed");
        }

        // --- Test 6: Rate Limiting (Reuse previous logic but with a new client or reset) ---
        console.log("\nTest 6: Rate Limiting...");
        // We use client1. It has already sent some messages.
        // We need to send > 10 messages in 1 second.
        let errorCount = 0;
        const rateLimitListener = (err) => {
            if (err.message === "Rate limit exceeded") {
                errorCount++;
            }
        };
        client1.on("error", rateLimitListener);

        for (let i = 0; i < 15; i++) {
            client1.emit("ping", { data: i });
        }

        await new Promise(r => setTimeout(r, 1500));

        if (errorCount > 0) {
            console.log(`✅ Rate limit verified (caught ${errorCount} errors)`);
        } else {
            throw new Error("Rate limit did not trigger");
        }
        client1.off("error", rateLimitListener);

        // --- Cleanup ---
        client1.close();
        client2.close();
        console.log("\nAll tests passed!");

    } catch (err) {
        console.error("\n❌ Test failed:", err);
        process.exit(1);
    } finally {
        if (serverProcess) {
            serverProcess.kill();
        }
        process.exit(0);
    }
}

runTests();
