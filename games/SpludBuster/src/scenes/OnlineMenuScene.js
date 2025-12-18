// ==================== SCÈNE MENU ONLINE ====================
class OnlineMenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'OnlineMenuScene' });
        this.socket = null;
        this.clientId = null;
        this.username = null;
    }

    create() {
        const { width, height } = this.cameras.main;

        // Background
        this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

        // Title
        this.add.text(width / 2, 100, 'MODE ONLINE', {
            fontSize: '48px',
            fontFamily: 'Arial Black',
            fill: '#00ff88',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);

        // Username input
        this.add.text(width / 2, 200, 'Entrez votre nom:', {
            fontSize: '20px',
            fill: '#ffffff'
        }).setOrigin(0.5);

        // Username box (HTML input)
        const inputBox = document.createElement('input');
        inputBox.type = 'text';
        inputBox.id = 'usernameInput';
        inputBox.placeholder = 'Votre nom...';
        inputBox.maxLength = 20;
        inputBox.style.position = 'absolute';
        inputBox.style.left = '50%';
        inputBox.style.top = '240px';
        inputBox.style.transform = 'translateX(-50%)';
        inputBox.style.width = '300px';
        inputBox.style.height = '40px';
        inputBox.style.fontSize = '18px';
        inputBox.style.textAlign = 'center';
        inputBox.style.border = '2px solid #00ff88';
        inputBox.style.borderRadius = '5px';
        inputBox.style.backgroundColor = '#2d3e50';
        inputBox.style.color = '#ffffff';
        inputBox.style.outline = 'none';
        document.body.appendChild(inputBox);

        // Connection status
        this.statusText = this.add.text(width / 2, 320, '', {
            fontSize: '16px',
            fill: '#ffaa00'
        }).setOrigin(0.5);

        // Create button
        const createBtn = this.add.rectangle(width / 2 - 140, 420, 220, 70, 0x00ff88);
        createBtn.setInteractive({ useHandCursor: true });

        this.add.text(width / 2 - 140, 420, 'CRÉER', {
            fontSize: '24px',
            fontStyle: 'bold',
            fill: '#000000'
        }).setOrigin(0.5);

        createBtn.on('pointerdown', () => this.createLobby());
        createBtn.on('pointerover', () => createBtn.setFillStyle(0x00dd66));
        createBtn.on('pointerout', () => createBtn.setFillStyle(0x00ff88));

        // Join button
        const joinBtn = this.add.rectangle(width / 2 + 140, 420, 220, 70, 0x0088ff);
        joinBtn.setInteractive({ useHandCursor: true });

        this.add.text(width / 2 + 140, 420, 'REJOINDRE', {
            fontSize: '24px',
            fontStyle: 'bold',
            fill: '#ffffff'
        }).setOrigin(0.5);

        joinBtn.on('pointerdown', () => this.joinLobby());
        joinBtn.on('pointerover', () => joinBtn.setFillStyle(0x0066dd));
        joinBtn.on('pointerout', () => joinBtn.setFillStyle(0x0088ff));

        // Back button
        const backBtn = this.add.rectangle(width / 2, height - 80, 200, 50, 0x666666);
        backBtn.setInteractive({ useHandCursor: true });

        this.add.text(width / 2, height - 80, '← Retour', {
            fontSize: '18px',
            fill: '#ffffff'
        }).setOrigin(0.5);

        backBtn.on('pointerdown', () => {
            this.cleanup();
            this.scene.start('MenuScene');
        });
        backBtn.on('pointerover', () => backBtn.setFillStyle(0x888888));
        backBtn.on('pointerout', () => backBtn.setFillStyle(0x666666));

        // Auto-connect to server
        this.connectToServer();
    }

    connectToServer() {
        this.statusText.setText('🔄 Connexion au serveur...');

        this.socket = new WebSocket('wss://server-yi14.onrender.com');

        this.socket.addEventListener('open', () => {
            console.log('✅ Connected to server');
            this.statusText.setText('✅ Connecté au serveur');
            this.statusText.setColor('#00ff88');
        });

        this.socket.addEventListener('message', (e) => {
            try {
                const msg = JSON.parse(e.data);
                this.handleServerMsg(msg);
            } catch (err) {
                console.error('Failed to parse message:', err);
            }
        });

        this.socket.addEventListener('close', () => {
            console.log('🔴 Disconnected from server');
            this.statusText.setText('❌ Déconnecté du serveur');
            this.statusText.setColor('#ff4444');
        });

        this.socket.addEventListener('error', (e) => {
            console.error('⚠️ WebSocket error:', e);
            this.statusText.setText('⚠️ Erreur de connexion');
            this.statusText.setColor('#ff4444');
        });
    }

    handleServerMsg(msg) {
        switch (msg.type) {
            case 'welcome':
                this.clientId = msg.clientId;
                console.log('🆔 Client ID:', this.clientId);
                break;

            case 'registered':
                console.log('👤 Registered as', msg.username);
                this.username = msg.username;
                break;

            case 'lobbyCreated':
                console.log('🏠 Lobby created:', msg.lobbyId);
                this.goToLobby(msg.lobbyId, true);
                break;

            case 'lobbyJoined':
                console.log('✅ Joined lobby:', msg.lobbyId);
                this.goToLobby(msg.lobbyId, false);
                break;

            case 'error':
                alert('❗ ' + msg.message);
                this.statusText.setText('');
                break;
        }
    }

    createLobby() {
        const input = document.getElementById('usernameInput');
        const username = input.value.trim();

        if (!username) {
            alert('Veuillez entrer votre nom !');
            return;
        }

        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            alert('Pas encore connecté au serveur. Attendez un instant...');
            return;
        }

        this.statusText.setText('🔄 Enregistrement...');

        // Register first
        this.socket.send(JSON.stringify({ type: 'register', username }));

        // Wait a bit then create lobby
        setTimeout(() => {
            this.statusText.setText('🔄 Création du lobby...');
            this.socket.send(JSON.stringify({ type: 'createLobby' }));
        }, 200);
    }

    joinLobby() {
        const input = document.getElementById('usernameInput');
        const username = input.value.trim();

        if (!username) {
            alert('Veuillez entrer votre nom !');
            return;
        }

        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            alert('Pas encore connecté au serveur. Attendez un instant...');
            return;
        }

        const code = prompt('Entrez le code du lobby (6 caractères):');
        if (!code || code.trim().length !== 6) {
            alert('Code invalide !');
            return;
        }

        this.statusText.setText('🔄 Enregistrement...');

        // Register first
        this.socket.send(JSON.stringify({ type: 'register', username }));

        // Wait a bit then join lobby
        setTimeout(() => {
            this.statusText.setText('🔄 Connexion au lobby...');
            this.socket.send(JSON.stringify({ type: 'joinLobby', lobbyId: code.trim().toUpperCase() }));
        }, 200);
    }

    goToLobby(lobbyId, isHost) {
        this.cleanup();

        this.scene.start('LobbyScene', {
            socket: this.socket,
            clientId: this.clientId,
            username: this.username,
            lobbyId: lobbyId,
            isHost: isHost
        });
    }

    cleanup() {
        // Remove HTML input
        const input = document.getElementById('usernameInput');
        if (input) {
            input.remove();
        }
    }

    shutdown() {
        this.cleanup();
    }
}
