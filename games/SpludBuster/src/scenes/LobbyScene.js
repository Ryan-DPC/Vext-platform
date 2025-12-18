// ==================== SCÈNE LOBBY ====================
class LobbyScene extends Phaser.Scene {
    constructor() {
        super({ key: 'LobbyScene' });
        this.playersList = [];
    }

    init(data) {
        // Receive data from previous scene
        this.socket = data.socket;
        this.clientId = data.clientId;
        this.username = data.username;
        this.lobbyId = data.lobbyId;
        this.isHost = data.isHost || false;
    }

    create() {
        const { width, height } = this.cameras.main;

        // Background
        this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

        // Title
        this.add.text(width / 2, 80, 'LOBBY', {
            fontSize: '48px',
            fontFamily: 'Arial Black',
            fill: '#00ff88',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);

        // Lobby code display
        this.add.text(width / 2, 160, 'Code du Lobby:', {
            fontSize: '20px',
            fill: '#ffffff'
        }).setOrigin(0.5);

        // Big lobby code box
        const codeBox = this.add.rectangle(width / 2, 220, 300, 80, 0x0f3460);
        codeBox.setStrokeStyle(3, 0x00ff88);

        this.lobbyCodeText = this.add.text(width / 2, 220, this.lobbyId || '------', {
            fontSize: '42px',
            fontFamily: 'Courier New',
            fontStyle: 'bold',
            fill: '#00ff88'
        }).setOrigin(0.5);

        // Copy button
        const copyBtn = this.add.rectangle(width / 2, 290, 200, 40, 0x00ff88);
        copyBtn.setInteractive({ useHandCursor: true });

        const copyText = this.add.text(width / 2, 290, 'Copier le code', {
            fontSize: '16px',
            fill: '#000000',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        copyBtn.on('pointerdown', () => {
            navigator.clipboard.writeText(this.lobbyId);
            copyText.setText('✓ Copié !');
            this.time.delayedCall(2000, () => copyText.setText('Copier le code'));
        });

        copyBtn.on('pointerover', () => copyBtn.setFillStyle(0x00dd66));
        copyBtn.on('pointerout', () => copyBtn.setFillStyle(0x00ff88));

        // Players section
        this.add.text(width / 2, 360, 'Joueurs:', {
            fontSize: '24px',
            fill: '#ffffff'
        }).setOrigin(0.5);

        // Player list container
        this.playersContainer = this.add.container(width / 2, 420);

        // Add yourself to the list
        this.addPlayerToList(this.clientId, this.username, true);

        // Start button (only for host)
        if (this.isHost) {
            this.startBtn = this.add.rectangle(width / 2, height - 100, 250, 60, 0xff4444);
            this.startBtn.setInteractive({ useHandCursor: true });

            this.startText = this.add.text(width / 2, height - 100, 'Démarrer la partie', {
                fontSize: '20px',
                fontStyle: 'bold',
                fill: '#ffffff'
            }).setOrigin(0.5);

            this.startBtn.on('pointerdown', () => this.startGame());
            this.startBtn.on('pointerover', () => this.startBtn.setFillStyle(0xdd2222));
            this.startBtn.on('pointerout', () => this.startBtn.setFillStyle(0xff4444));

            // Disable start until at least 2 players
            this.updateStartButton();
        }

        // Back button
        const backBtn = this.add.rectangle(100, height - 50, 160, 40, 0x666666);
        backBtn.setInteractive({ useHandCursor: true });

        const backText = this.add.text(100, height - 50, '← Retour', {
            fontSize: '16px',
            fill: '#ffffff'
        }).setOrigin(0.5);

        backBtn.on('pointerdown', () => this.leaveLobby());
        backBtn.on('pointerover', () => backBtn.setFillStyle(0x888888));
        backBtn.on('pointerout', () => backBtn.setFillStyle(0x666666));

        // Listen to server messages
        this.setupServerListeners();
    }

    setupServerListeners() {
        if (!this.socket) return;

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
                    this.addPlayerToList(msg.clientId, msg.username, false);
                    this.updateStartButton();
                }
                break;

            case 'playerLeft':
                this.removePlayerFromList(msg.clientId);
                this.updateStartButton();
                break;

            case 'gameStarting':
                // Host initiated game start
                this.startGame();
                break;
        }
    }

    addPlayerToList(clientId, username, isYou = false) {
        // Check if player already exists
        if (this.playersList.find(p => p.id === clientId)) return;

        const index = this.playersList.length;
        const yOffset = index * 50;

        const playerBox = this.add.rectangle(0, yOffset, 400, 45, 0x2d3e50);
        playerBox.setStrokeStyle(2, isYou ? 0x00ff88 : 0x555555);

        const playerText = this.add.text(-180, yOffset, `${username}${isYou ? ' (vous)' : ''}`, {
            fontSize: '18px',
            fill: isYou ? '#00ff88' : '#ffffff'
        }).setOrigin(0, 0.5);

        const readyIndicator = this.add.circle(180, yOffset, 8, isYou ? 0x00ff88 : 0x666666);

        this.playersContainer.add([playerBox, playerText, readyIndicator]);

        this.playersList.push({
            id: clientId,
            username,
            box: playerBox,
            text: playerText,
            indicator: readyIndicator
        });

        console.log(`Added player: ${username}`);
    }

    removePlayerFromList(clientId) {
        const index = this.playersList.findIndex(p => p.id === clientId);
        if (index === -1) return;

        const player = this.playersList[index];
        player.box.destroy();
        player.text.destroy();
        player.indicator.destroy();

        this.playersList.splice(index, 1);

        // Reposition remaining players
        this.playersList.forEach((p, i) => {
            const yOffset = i * 50;
            p.box.y = yOffset;
            p.text.y = yOffset;
            p.indicator.y = yOffset;
        });

        console.log(`Removed player: ${clientId}`);
    }

    updateStartButton() {
        if (!this.isHost || !this.startBtn) return;

        const canStart = this.playersList.length >= 2;

        if (canStart) {
            this.startBtn.setFillStyle(0xff4444);
            this.startBtn.setInteractive({ useHandCursor: true });
            this.startText.setAlpha(1);
        } else {
            this.startBtn.setFillStyle(0x333333);
            this.startBtn.disableInteractive();
            this.startText.setAlpha(0.5);
        }
    }

    startGame() {
        console.log('🎮 Starting game...');

        // Notify server if host
        if (this.isHost && this.socket) {
            this.socket.send(JSON.stringify({ type: 'startGame' }));
        }

        // Pass the socket and lobby data to GameScene
        this.scene.start('GameScene', {
            socket: this.socket,
            clientId: this.clientId,
            username: this.username,
            lobbyId: this.lobbyId,
            isOnline: true
        });
    }

    leaveLobby() {
        if (this.socket) {
            this.socket.send(JSON.stringify({ type: 'leaveLobby' }));
            this.socket.close();
        }

        this.scene.start('MenuScene');
    }
}
