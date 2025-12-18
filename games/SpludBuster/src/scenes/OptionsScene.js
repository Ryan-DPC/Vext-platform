class OptionsScene extends Phaser.Scene {
    constructor() {
        super({ key: 'OptionsScene' });
    }

    init() {
        // Charger les options depuis localStorage
        this.settings = {
            volume: parseFloat(localStorage.getItem('gameVolume') || '0.3'),
            difficulty: localStorage.getItem('gameDifficulty') || 'normal',
            playerSpeed: parseFloat(localStorage.getItem('playerSpeed') || '200')
        };
    }

    preload() {
        this.load.image('background', 'assets/background.png');
    }

    create() {
        // Fond animé
        this.background = this.add.tileSprite(0, 0, 960, 720, 'background');
        this.background.setOrigin(0, 0);
        this.background.setTileScale(0.5, 0.5);

        // Titre
        this.add.text(480, 80, 'OPTIONS', {
            fontSize: '64px',
            fill: '#4a90e2',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 8
        }).setOrigin(0.5);

        // ========== VOLUME ==========
        this.add.text(480, 180, 'Volume', {
            fontSize: '28px',
            fill: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        // Barre de volume (fond)
        this.volumeBarBg = this.add.rectangle(480, 230, 400, 30, 0x333333);
        this.volumeBarBg.setOrigin(0.5);
        this.volumeBarBg.setInteractive({ useHandCursor: true })
            .on('pointerdown', (pointer) => {
                this.updateVolume(pointer.x);
            })
            .on('pointermove', (pointer) => {
                if (pointer.isDown) {
                    this.updateVolume(pointer.x);
                }
            });

        // Barre de volume (actuelle)
        this.volumeBar = this.add.rectangle(280, 230, 200, 30, 0x4a90e2);
        this.volumeBar.setOrigin(0, 0.5);

        // Texte du volume
        this.volumeText = this.add.text(480, 270, Math.round(this.settings.volume * 100) + '%', {
            fontSize: '24px',
            fill: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Boutons +/- pour le volume
        const volMinus = this.add.rectangle(350, 230, 40, 40, 0x4a90e2)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                this.settings.volume = Math.max(0, this.settings.volume - 0.1);
                this.updateVolumeDisplay();
            });

        this.add.text(350, 230, '-', {
            fontSize: '32px',
            fill: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        const volPlus = this.add.rectangle(610, 230, 40, 40, 0x4a90e2)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                this.settings.volume = Math.min(1, this.settings.volume + 0.1);
                this.updateVolumeDisplay();
            });

        this.add.text(610, 230, '+', {
            fontSize: '32px',
            fill: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // ========== DIFFICULTÉ ==========
        this.add.text(480, 340, 'Difficulté', {
            fontSize: '28px',
            fill: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        const difficulties = ['Facile', 'Normal', 'Difficile'];
        const difficultyColors = [0x00ff00, 0xffff00, 0xff0000];
        const difficultyValues = ['easy', 'normal', 'hard'];

        this.difficultyButtons = [];
        difficulties.forEach((diff, index) => {
            const x = 280 + index * 200;
            const isSelected = difficultyValues[index] === this.settings.difficulty;
            const button = this.add.rectangle(x, 400, 150, 50,
                isSelected ? difficultyColors[index] : 0x666666)
                .setInteractive({ useHandCursor: true })
                .on('pointerdown', () => {
                    this.settings.difficulty = difficultyValues[index];
                    this.updateDifficultyButtons();
                });

            this.add.text(x, 400, diff, {
                fontSize: '24px',
                fill: '#ffffff',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 3
            }).setOrigin(0.5);

            this.difficultyButtons.push({ button, color: difficultyColors[index], value: difficultyValues[index] });
        });

        // ========== VITESSE DU JOUEUR ==========
        this.add.text(480, 480, 'Vitesse du joueur', {
            fontSize: '28px',
            fill: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        this.speedText = this.add.text(480, 520, this.settings.playerSpeed, {
            fontSize: '32px',
            fill: '#4a90e2',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        const speedMinus = this.add.rectangle(350, 520, 50, 50, 0x4a90e2)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                this.settings.playerSpeed = Math.max(100, this.settings.playerSpeed - 25);
                this.speedText.setText(this.settings.playerSpeed);
                localStorage.setItem('playerSpeed', this.settings.playerSpeed);
            });

        this.add.text(350, 520, '−', {
            fontSize: '40px',
            fill: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        const speedPlus = this.add.rectangle(610, 520, 50, 50, 0x4a90e2)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                this.settings.playerSpeed = Math.min(400, this.settings.playerSpeed + 25);
                this.speedText.setText(this.settings.playerSpeed);
                localStorage.setItem('playerSpeed', this.settings.playerSpeed);
            });

        this.add.text(610, 520, '+', {
            fontSize: '40px',
            fill: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Bouton Retour (déplacé plus bas)
        const backButton = this.add.rectangle(480, 780, 250, 50, 0x666666)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                this.saveSettings();
                this.scene.start('MenuScene');
            })
            .on('pointerover', () => {
                backButton.setFillStyle(0x777777);
                backButton.setScale(1.05);
            })
            .on('pointerout', () => {
                backButton.setFillStyle(0x666666);
                backButton.setScale(1);
            });

        this.add.text(480, 780, 'RETOUR', {
            fontSize: '28px',
            fill: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        // Touche Échap pour retourner
        this.input.keyboard.on('keydown-ESC', () => {
            this.saveSettings();
            this.scene.start('MenuScene');
        });

        // Ajouter la section Affichage
        this.createDisplaySection();

        // Initialiser l'affichage
        this.updateVolumeDisplay();
        this.updateDifficultyButtons();
        this.updateResolutionButtons();
    }

    createDisplaySection() {
        const startY = 600; // Position verticale de départ pour la section affichage

        // Titre Affichage
        this.add.text(480, startY, 'Affichage', {
            fontSize: '28px',
            fill: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        // Bouton Plein Écran
        const fullscreenBtn = this.add.rectangle(480, startY + 50, 200, 40, 0x4a90e2)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                this.toggleFullscreen();
            });

        this.fullscreenText = this.add.text(480, startY + 50, this.scale.isFullscreen ? 'Quitter Plein Écran' : 'Plein Écran', {
            fontSize: '20px',
            fill: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Résolutions
        const resolutions = [
            { w: 960, h: 720, label: '960x720' },
            { w: 1280, h: 720, label: '1280x720' },
            { w: 1920, h: 1080, label: '1920x1080' }
        ];

        this.resolutionButtons = [];
        resolutions.forEach((res, index) => {
            const x = 280 + index * 200;
            const y = startY + 110;

            const btn = this.add.rectangle(x, y, 180, 40, 0x666666)
                .setInteractive({ useHandCursor: true })
                .on('pointerdown', () => {
                    this.setResolution(res.w, res.h);
                });

            this.add.text(x, y, res.label, {
                fontSize: '20px',
                fill: '#ffffff',
                fontStyle: 'bold'
            }).setOrigin(0.5);

            this.resolutionButtons.push({ button: btn, w: res.w, h: res.h });
        });
    }

    toggleFullscreen() {
        if (this.scale.isFullscreen) {
            this.scale.stopFullscreen();
            this.fullscreenText.setText('Plein Écran');
        } else {
            this.scale.startFullscreen();
            this.fullscreenText.setText('Quitter Plein Écran');
        }
    }

    setResolution(width, height) {
        // Redimensionner la fenêtre (si possible, ex: Electron) ou le canvas
        if (window.resizeTo) {
            window.resizeTo(width, height);
        }

        // Mettre à jour la taille du jeu Phaser
        this.scale.resize(width, height);

        // Centrer le canvas
        this.scale.refresh();

        this.updateResolutionButtons();
    }

    updateResolutionButtons() {
        if (!this.resolutionButtons) return;

        const currentW = this.scale.width;
        const currentH = this.scale.height;

        this.resolutionButtons.forEach(({ button, w, h }) => {
            if (w === currentW && h === currentH) {
                button.setFillStyle(0x00ff00);
            } else {
                button.setFillStyle(0x666666);
            }
        });
    }

    updateVolume(x) {
        const barX = this.volumeBarBg.x - this.volumeBarBg.width / 2;
        const percent = Math.max(0, Math.min(1, (x - barX) / this.volumeBarBg.width));
        this.settings.volume = percent;
        this.updateVolumeDisplay();
    }

    updateVolumeDisplay() {
        const width = this.volumeBarBg.width * this.settings.volume;
        this.volumeBar.width = width;
        this.volumeBar.x = this.volumeBarBg.x - this.volumeBarBg.width / 2;
        this.volumeText.setText(Math.round(this.settings.volume * 100) + '%');
        localStorage.setItem('gameVolume', this.settings.volume);
    }

    updateDifficultyButtons() {
        this.difficultyButtons.forEach(({ button, color, value }) => {
            if (value === this.settings.difficulty) {
                button.setFillStyle(color);
            } else {
                button.setFillStyle(0x666666);
            }
        });
        localStorage.setItem('gameDifficulty', this.settings.difficulty);
    }

    saveSettings() {
        localStorage.setItem('gameVolume', this.settings.volume);
        localStorage.setItem('gameDifficulty', this.settings.difficulty);
        localStorage.setItem('playerSpeed', this.settings.playerSpeed);
    }

    update() {
        // Animation du fond
        this.background.tilePositionX += 0.5;
        this.background.tilePositionY += 0.5;
    }
}
