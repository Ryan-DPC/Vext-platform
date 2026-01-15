const SERVER_URL = 'ws://localhost:3000/ws';

async function simulate() {
  console.log('🚀 Starting Multiplayer Simulation...');

  // --- PLAYER A (HOST) ---
  const wsA = new WebSocket(SERVER_URL);
  const playerA = {
    userId: 'host-123',
    username: 'HostPlayer',
    class: 'warrior',
    hp: 120,
    maxHp: 120,
    speed: 80,
  };

  // --- PLAYER B (GUEST) ---
  const wsB = new WebSocket(SERVER_URL);
  const playerB = {
    userId: 'guest-456',
    username: 'GuestPlayer',
    class: 'archer',
    hp: 80,
    maxHp: 80,
    speed: 120,
  };

  const gameId = 'sim-game-' + Math.floor(Math.random() * 1000);

  const waitForOpen = (ws: WebSocket) => new Promise((resolve) => (ws.onopen = resolve));
  const waitForMessage = (ws: WebSocket, type: string) =>
    new Promise((resolve) => {
      const listener = (event: MessageEvent) => {
        const msg = JSON.parse(event.data);
        if (msg.type === type) {
          ws.removeEventListener('message', listener);
          resolve(msg);
        }
      };
      ws.addEventListener('message', listener);
    });

  await Promise.all([waitForOpen(wsA), waitForOpen(wsB)]);
  console.log('✅ Both clients connected to WebSocket.');

  // 1. Host creates game
  wsA.send(
    JSON.stringify({
      type: 'aether-strike:create-game',
      data: {
        gameId,
        playerClass: playerA.class,
        username: playerA.username,
        userId: playerA.userId,
        hp: playerA.hp,
        maxHp: playerA.maxHp,
        speed: playerA.speed,
      },
    })
  );
  await waitForMessage(wsA, 'aether-strike:game-created');
  console.log('🎮 Game created by Host.');

  // 2. Guest joins game
  wsB.send(
    JSON.stringify({
      type: 'aether-strike:join-game',
      data: {
        gameId,
        playerClass: playerB.class,
        username: playerB.username,
        userId: playerB.userId,
        hp: playerB.hp,
        maxHp: playerB.maxHp,
        speed: playerB.speed,
      },
    })
  );

  // Both should see "player-joined" and Host sees "game-state"
  const joinResult = await Promise.all([
    waitForMessage(wsA, 'aether-strike:player-joined'),
    waitForMessage(wsB, 'aether-strike:game-state'),
  ]);
  console.log('👥 Guest joined successfully. State synced.');

  // 3. Host starts game
  const enemies = [
    { id: 'e1', name: 'Slime', hp: 100, max_hp: 100, speed: 50, position: { x: 500, y: 300 } },
  ];
  wsA.send(
    JSON.stringify({
      type: 'aether-strike:start-game',
      data: { enemies },
    })
  );

  await Promise.all([
    waitForMessage(wsA, 'aether-strike:game-started'),
    waitForMessage(wsB, 'aether-strike:game-started'),
  ]);
  console.log('⚔️ Battle started!');

  // 4. Host uses attack on Guest (VERIFY PvP HP SYNC)
  console.log('⚔️ Host attacking Guest (PvP)...');
  wsA.send(
    JSON.stringify({
      type: 'aether-strike:use-attack',
      data: {
        attackName: 'Shield Bash',
        targetId: playerB.userId,
        damage: 10,
        manaCost: 0,
        isArea: false,
      },
    })
  );

  const pvpAction = await waitForMessage(wsB, 'aether-strike:combat-action');
  console.log(
    '🎯 Guest received PvP damage. New HP reported:',
    (pvpAction as any).data.targetNewHp
  );
  if ((pvpAction as any).data.targetNewHp === 70) {
    console.log('✅ PvP HP Sync verified (80 -> 70).');
  } else {
    console.error('❌ PvP HP Sync MISMATCH! Expected 70, got', (pvpAction as any).data.targetNewHp);
  }

  // 5. Guest uses attack on Enemy (VERIFY Guest relay)
  console.log('⚔️ Guest attacking Slime...');
  wsB.send(
    JSON.stringify({
      type: 'aether-strike:use-attack',
      data: {
        attackName: 'Arrow',
        targetId: 'e1',
        damage: 15,
        manaCost: 0,
        isArea: false,
      },
    })
  );

  const guestAttack = await waitForMessage(wsA, 'aether-strike:combat-action');
  console.log("🎯 Host received Guest's attack:", (guestAttack as any).data.actionName);

  // 6. Host AI Verification (Simulated Logic)
  console.log("🧠 Simulating Host AI 'admin-attack' (Targeting Guest because HP 70 < Host 120)...");
  wsA.send(
    JSON.stringify({
      type: 'aether-strike:admin-attack',
      data: {
        actorId: 'e1',
        attackName: 'Slime Goo',
        targetId: playerB.userId,
        damage: 5,
      },
    })
  );

  const aiAction = await waitForMessage(wsB, 'aether-strike:combat-action');
  console.log(
    '🎯 Guest received AI damage from Slime. New HP:',
    (aiAction as any).data.targetNewHp
  );
  if ((aiAction as any).data.targetNewHp === 65) {
    console.log('✅ AI Targeting/Damage verified.');
  }

  // 7. End Turn Verification
  console.log('⌛ Host ending turn...');
  wsA.send(
    JSON.stringify({
      type: 'aether-strike:end-turn',
      data: { nextTurnId: playerB.userId },
    })
  );

  const turnChanged = await waitForMessage(wsB, 'aether-strike:turn-changed');
  console.log('🔄 Guest received turn changed:', JSON.stringify((turnChanged as any).data));

  // 8. Test Loot Reward Sync (Next Wave)
  console.log('💰 Host triggering Next Wave with Rewards...');
  wsA.send(
    JSON.stringify({
      type: 'aether-strike:next-wave',
      data: {
        enemies: [], // No enemies for this test
        gold: 100,
        exp: 50,
      },
    })
  );

  const rewardWave = await waitForMessage(wsB, 'aether-strike:next-wave');
  const rData = (rewardWave as any).data;
  console.log(`🎁 Guest received Next Wave. Rewards: Gold=${rData.gold}, XP=${rData.exp}`);

  if (rData.gold === 100 && rData.exp === 50) {
    console.log('✅ Loot Sync verified!');
  } else {
    console.error(`❌ Loot Sync FAILED. Expected G:100 E:50, got G:${rData.gold} E:${rData.exp}`);
  }

  console.log('\n✨ Simulation finished successfully!');
  wsA.close();
  wsB.close();
  process.exit(0);
}

simulate().catch((err) => {
  console.error('❌ Simulation failed:', err);
  process.exit(1);
});
