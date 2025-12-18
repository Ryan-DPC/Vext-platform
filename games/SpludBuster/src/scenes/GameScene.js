// ==================== SCÈNE JEU ====================
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        // Online multiplayer properties
        this.socket = null;
        this.clientId = null;
        this.username = null;
        this.lobbyId = null;
        this.remotePlayers = new Map();
    }

    init(data) {
        // Receive data from lobby scene if coming from online mode
        if (data && data.isOnline) {
            this.socket = data.socket;
            this.clientId = data.clientId;
            this.username = data.username;
            this.lobbyId = data.lobbyId;
            console.log('🌐 Online mode - Lobby:', this.lobbyId);
        } else {
            // Solo mode - clear multiplayer data
            this.socket = null;
            this.clientId = null;
            this.username = null;
            this.lobbyId = null;
            console.log('🎮 Solo mode');
        }
    }

    preload() {
        // Charger tous les assets
        this.load.spritesheet('characterSheet', 'assets/character/SPRITE_SHEET.png', {
            frameWidth: 32,
            frameHeight: 32
        });
        this.load.image('bullet', 'assets/bullet.png');
        this.load.image('enemy', 'assets/enemy.png');
        this.load.image('background', 'assets/background.png');
        this.load.audio('hit', 'assets/hit.wav');

        // Charger toutes les armes pour les projectiles
        const weapons = WEAPONS;

        weapons.forEach(weapon => {
            this.load.image(`weapon_${weapon}`, `assets/weapon/${weapon}.png`);
        });

        // Charger les projectiles spécifiques
        this.load.image('projectile_fireball', 'assets/weapon/fire/fireball.png');
        this.load.image('projectile_arrow', 'assets/weapon/Spear01.png');
        this.load.image('projectile_bullet', 'assets/weapon/fire/bullet.png');
    }

    create() {
        // Charger les paramètres depuis localStorage
        this.settings = {
            volume: parseFloat(localStorage.getItem('gameVolume') || '0.3'),
            difficulty: localStorage.getItem('gameDifficulty') || 'normal',
            playerSpeed: parseFloat(localStorage.getItem('playerSpeed') || '150'),
            selectedWeapon: localStorage.getItem('selectedWeapon') || 'Sword01'
        };

        // Réinitialiser les variables
        this.score = 0;
        this.totalExp = 0;
        this.totalGold = 0;
        this.playerLevel = 1;
        this.expForNextLevel = 50;
        this.gameOver = false;

        // Reset online multiplayer state
        this.remotePlayers.clear();

        // Système d'Inventaire (Max 4 armes)
        this.inventory = [];

        // Ajouter l'arme de départ
        this.addWeaponToInventory(this.settings.selectedWeapon, 0);

        // Système de Vagues
        this.currentWave = 1;
        this.waveDuration = 60;
        this.waveTimer = this.waveDuration;
        this.isWaveActive = true;
        this.playerStats = {
            damage: 0,
            speed: this.settings.playerSpeed,
            maxHealth: 20,
            regen: 0,
            critChance: 0
        };

        // Définir un monde plus grand (Brotato-style)
        const worldWidth = 2400;
        const worldHeight = 1800;
        this.physics.world.setBounds(0, 0, worldWidth, worldHeight);

        // Fond
        this.background = this.add.image(worldWidth / 2, worldHeight / 2, 'background');
        this.background.setDisplaySize(worldWidth, worldHeight);
        this.background.setOrigin(0.5, 0.5);
        this.background.setDepth(-1);

        // Joueur
        this.player = this.physics.add.sprite(worldWidth / 2, worldHeight / 2, 'characterSheet', 0);
        this.player.setCollideWorldBounds(true);
        this.player.setScale(6.0);
        this.player.body.setSize(28, 28);
        this.player.health = 20;

        // Animations
        this.anims.create({
            key: 'characterIdle',
            frames: this.anims.generateFrameNumbers('characterSheet', { start: 0, end: 7 }),
            frameRate: 6,
            repeat: -1
        });
        this.anims.create({
            key: 'characterWalk',
            frames: this.anims.generateFrameNumbers('characterSheet', { start: 8, end: 15 }),
            frameRate: 8,
            repeat: -1
        });
        this.player.play('characterIdle');

        // Caméra
        this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cameras.main.setZoom(0.6);

        // Groupes
        this.bullets = this.physics.add.group({ maxSize: 200 });
        this.enemies = this.physics.add.group();

        // Contrôles
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasdKeys = this.input.keyboard.addKeys('W,S,A,D');

        // Collisions
        this.physics.add.overlap(this.bullets, this.enemies, this.hitEnemy, null, this);
        this.physics.add.overlap(this.enemies, this.player, this.hitPlayer, null, this);

        // UI
        this.scene.launch('UIScene');

        // Son
        this.hitSound = this.sound.add('hit', { volume: this.settings.volume });

        // Spawn
        this.spawnEvent = this.time.addEvent({
            delay: 1500,
            callback: this.spawnEnemy,
            callbackScope: this,
            loop: true
        });

        // Inputs
        this.input.keyboard.on('keydown-R', () => { if (this.gameOver) { this.scene.stop('UIScene'); this.scene.restart(); } });
        this.input.keyboard.on('keydown-M', () => { if (this.gameOver) { this.scene.stop('UIScene'); this.scene.start('MenuScene'); } });
        this.input.keyboard.on('keydown-ESC', () => { if (!this.gameOver) { this.scene.pause(); this.scene.launch('PauseScene'); } });

        // Setup server listeners if online
        if (this.socket && this.lobbyId) {
            this.setupServerListeners();
        }
    }

    setupServerListeners() {
        this.socket.addEventListener('message', (e) => {
            try {
                const msg = JSON.parse(e.data);
                this.handleServerMsg(msg);
            } catch (err) {
                console.error('Failed to parse message:', err);
            }
        });
    }

    handleServerMsg(msg) {
        switch (msg.type) {
            case 'playerJoined':
                if (msg.clientId !== this.clientId) {
                    this.createRemotePlayer(msg.clientId, msg.username);
                }
                break;

            case 'playerLeft':
                this.removeRemotePlayer(msg.clientId);
                break;

            case 'lobbyMessage':
                this.applyLobbyPayload(msg.from, msg.payload);
                break;
        }
    }

    addWeaponToInventory(key, tier) {
        if (this.inventory.length >= MAX_WEAPONS) return false;

        this.inventory.push({
            key: key,
            tier: tier,
            lastShot: 0,
            cooldown: 1200
        });
        return true;
    }

    update(time, delta) {
        if (this.gameOver) return;

        // Timer Vague
        if (this.isWaveActive) {
            this.waveTimer -= delta / 1000;
            if (this.waveTimer <= 0) this.endWave();
            else this.events.emit('updateWaveTime', Math.ceil(this.waveTimer));
        }

        // Mouvement
        let speed = this.settings.playerSpeed;
        let velocityX = 0;
        let velocityY = 0;

        if (this.cursors.left.isDown || this.wasdKeys.A.isDown) velocityX = -speed;
        else if (this.cursors.right.isDown || this.wasdKeys.D.isDown) velocityX = speed;

        if (this.cursors.up.isDown || this.wasdKeys.W.isDown) velocityY = -speed;
        else if (this.cursors.down.isDown || this.wasdKeys.S.isDown) velocityY = speed;

        if (velocityX !== 0 && velocityY !== 0) {
            velocityX *= 0.707;
            velocityY *= 0.707;
        }

        this.player.setVelocity(velocityX, velocityY);

        if (velocityX < -10) this.player.flipX = true;
        else if (velocityX > 10) this.player.flipX = false;

        const actualSpeed = Math.abs(this.player.body.velocity.x) + Math.abs(this.player.body.velocity.y);
        if (actualSpeed > 10) {
            if (this.player.anims.currentAnim?.key !== 'characterWalk') this.player.play('characterWalk');
        } else {
            if (this.player.anims.currentAnim?.key !== 'characterIdle') this.player.play('characterIdle');
        }

        // Tir automatique pour CHAQUE arme
        this.inventory.forEach(weapon => {
            if (time - weapon.lastShot > weapon.cooldown) {
                this.shoot(weapon);
                weapon.lastShot = time;
            }
        });

        // Send position update if online (throttled to ~10 times per second)
        if (this.socket && this.lobbyId) {
            if (!this.lastSync || time - this.lastSync > 100) {
                this.sendGameUpdate({
                    type: 'position',
                    x: this.player.x,
                    y: this.player.y,
                    flipX: this.player.flipX,
                    anim: this.player.anims.currentAnim?.key
                });
                this.lastSync = time;
            }
        }
    }

    shoot(weapon) {
        if (this.gameOver) return;

        let closestEnemy = null;
        let closestDistance = Infinity;

        this.enemies.children.entries.forEach(enemy => {
            let distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestEnemy = enemy;
            }
        });

        let angle = 0;
        if (closestEnemy) {
            angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, closestEnemy.x, closestEnemy.y);
        } else {
            angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
        }

        let bullet = this.bullets.get(this.player.x, this.player.y);
        if (!bullet) {
            let texture = `weapon_${weapon.key}`;
            if (weapon.key.includes('Staff')) texture = 'projectile_fireball';
            else if (weapon.key.includes('Bow')) texture = 'weapon_Spear01';
            else if (weapon.key.includes('Revolver')) texture = 'projectile_bullet';

            bullet = this.physics.add.sprite(this.player.x, this.player.y, texture);
            this.bullets.add(bullet);
        }

        if (bullet) {
            let texture = `weapon_${weapon.key}`;
            let scale = 2.5;
            let rotationOffset = 0;
            let targetSize = 30;

            if (weapon.key.includes('Staff')) {
                texture = 'projectile_fireball';
                scale = 0.15;
                rotationOffset = -Math.PI / 2;
            } else if (weapon.key.includes('Bow')) {
                texture = 'weapon_Spear01';
                scale = 1.0;
                rotationOffset = -Math.PI / 4;
            } else if (weapon.key.includes('Revolver')) {
                texture = 'projectile_bullet';
                scale = 0.2;
            }

            bullet.setTexture(texture);
            bullet.setActive(true);
            bullet.setVisible(true);
            bullet.body.enable = true;
            bullet.setScale(scale);

            if (texture !== `weapon_${weapon.key}`) {
                let bodySize = targetSize / scale;
                bullet.body.setSize(bodySize, bodySize);
                bullet.body.setOffset(
                    (bullet.width - bodySize) / 2,
                    (bullet.height - bodySize) / 2
                );
            } else {
                bullet.body.setSize(bullet.width, bullet.height);
                bullet.body.setOffset(0, 0);
            }

            const tierInfo = WEAPON_TIERS[weapon.tier];
            bullet.damageMultiplier = tierInfo.multiplier;

            let speed = 400;
            bullet.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
            bullet.rotation = angle + rotationOffset;
        }
    }

    spawnEnemy() {
        if (this.gameOver) return;

        const spawnDistance = 600;
        const spawnAngle = Phaser.Math.FloatBetween(0, Math.PI * 2);
        const x = this.player.x + Math.cos(spawnAngle) * spawnDistance;
        const y = this.player.y + Math.sin(spawnAngle) * spawnDistance;

        let enemy = this.enemies.create(x, y, 'enemy');
        enemy.setCollideWorldBounds(true);
        enemy.setScale(0.3);
        enemy.body.setSize(25, 25);

        let baseSpeed = 60;
        let difficultyMultiplier = 1;

        switch (this.settings.difficulty) {
            case 'easy':
                difficultyMultiplier = 0.5;
                break;
            case 'normal':
                difficultyMultiplier = 0.7;
                break;
            case 'hard':
                difficultyMultiplier = 1.0;
                break;
        }

        let speed = (baseSpeed + (this.score * 0.3)) * difficultyMultiplier;
        let enemyAngle = Phaser.Math.Angle.Between(x, y, this.player.x, this.player.y);
        enemy.setVelocity(
            Math.cos(enemyAngle) * speed,
            Math.sin(enemyAngle) * speed
        );
    }

    hitEnemy(bullet, enemy) {
        bullet.setActive(false);
        bullet.setVisible(false);
        bullet.body.enable = false;
        bullet.setVelocity(0, 0);

        this.createExplosion(enemy.x, enemy.y);
        this.hitSound.setVolume(this.settings.volume);
        this.hitSound.play();

        const expGained = Phaser.Math.Between(2, 5);
        const goldGained = Phaser.Math.Between(1, 2);
        this.totalExp += expGained;
        this.totalGold += goldGained;

        this.showFloatingText(enemy.x - 15, enemy.y - 30, `+${expGained} EXP`, '#00ffff');
        this.showFloatingText(enemy.x + 15, enemy.y - 30, `+${goldGained} G`, '#ffff00');

        this.events.emit('updateGold', this.totalGold);
        this.events.emit('updateXP', this.totalExp % this.expForNextLevel, this.expForNextLevel);

        this.checkLevelUp();
        enemy.destroy();

        this.score += 10;
        this.events.emit('updateScore', this.score);
    }

    hitPlayer(player, enemy) {
        player.health = (player.health || 20) - 2;
        this.events.emit('updateHP', player.health, 20);

        if (player.health <= 0) {
            player.health = 0;
            this.endGame();
        }

        enemy.destroy();

        player.setTint(0xff0000);
        this.time.delayedCall(100, () => {
            if (player && player.active) {
                player.clearTint();
            }
        });
    }

    createExplosion(x, y) {
        for (let i = 0; i < 8; i++) {
            let particle = this.add.circle(
                x, y,
                Phaser.Math.Between(2, 5),
                0xffaa00
            );
            let particleAngle = (Math.PI * 2 * i) / 8;
            let particleSpeed = Phaser.Math.Between(50, 150);
            this.tweens.add({
                targets: particle,
                x: x + Math.cos(particleAngle) * particleSpeed,
                y: y + Math.sin(particleAngle) * particleSpeed,
                alpha: 0,
                duration: 300,
                onComplete: () => particle.destroy()
            });
        }
    }

    checkLevelUp() {
        while (this.totalExp >= this.expForNextLevel * this.playerLevel) {
            this.playerLevel++;

            this.cameras.main.flash(200, 0, 150, 255);
            this.showFloatingText(this.player.x, this.player.y - 50, `LEVEL UP!\nLVL ${this.playerLevel}`, '#00ff00');

            this.player.health = Math.min(20, this.player.health + 2);
            this.settings.playerSpeed += 5;

            this.events.emit('levelUp', this.playerLevel);
            this.events.emit('updateHP', this.player.health, 20);

            this.expForNextLevel = ~~(this.expForNextLevel * 1.5);
        }
    }

    showFloatingText(x, y, text, color) {
        const floatingText = this.add.text(x, y, text, {
            fontSize: '16px',
            fill: color,
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);

        this.tweens.add({
            targets: floatingText,
            y: y - 50,
            alpha: 0,
            duration: 1000,
            ease: 'Power2',
            onComplete: () => floatingText.destroy()
        });
    }

    endWave() {
        this.isWaveActive = false;
        this.enemies.clear(true, true);

        if (this.spawnEvent) this.spawnEvent.remove();

        this.scene.pause();
        this.scene.launch('ShopScene', {
            gameScene: this,
            wave: this.currentWave,
            gold: this.totalGold,
            inventory: this.inventory
        });
    }

    startNextWave() {
        this.scene.resume();
        this.scene.stop('ShopScene');

        this.currentWave++;
        this.waveTimer = 60;
        this.isWaveActive = true;

        this.events.emit('updateWaveNumber', this.currentWave);

        this.spawnEvent = this.time.addEvent({
            delay: Math.max(500, 1500 - (this.currentWave * 100)),
            callback: this.spawnEnemy,
            callbackScope: this,
            loop: true
        });
    }

    endGame() {
        this.gameOver = true;
        this.player.setVelocity(0, 0);
        this.events.emit('gameOver', {
            score: this.score,
            totalExp: this.totalExp,
            totalGold: this.totalGold
        });

        this.enemies.children.entries.forEach(enemy => {
            enemy.setVelocity(0, 0);
        });
    }

    // ==================== ONLINE MULTIPLAYER ====================

    sendGameUpdate(payload) {
        if (!this.socket || !this.lobbyId) return;
        this.socket.send(JSON.stringify({ type: 'lobbyMessage', payload }));
    }

    applyLobbyPayload(fromClientId, payload) {
        if (fromClientId === this.clientId) return;

        const remote = this.remotePlayers.get(fromClientId);
        if (!remote) return;

        if (payload.type === 'position') {
            remote.sprite.setPosition(payload.x, payload.y);
            remote.sprite.flipX = payload.flipX;
            if (payload.anim && remote.sprite.anims.currentAnim?.key !== payload.anim) {
                remote.sprite.play(payload.anim);
            }
            remote.nameText.setPosition(payload.x, payload.y - 100);
        }
    }

    createRemotePlayer(clientId, username) {
        if (this.remotePlayers.has(clientId)) return;

        const sprite = this.physics.add.sprite(
            this.player.x + 100,
            this.player.y,
            'characterSheet',
            0
        );
        sprite.setScale(6.0);
        sprite.setTint(0x88ff88);
        sprite.play('characterIdle');

        const nameText = this.add.text(sprite.x, sprite.y - 100, username, {
            fontSize: '12px',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);

        this.remotePlayers.set(clientId, { sprite, nameText, username });
        console.log('Created remote player:', username);
    }

    removeRemotePlayer(clientId) {
        const remote = this.remotePlayers.get(clientId);
        if (remote) {
            remote.sprite.destroy();
            remote.nameText.destroy();
            this.remotePlayers.delete(clientId);
        }
    }
}