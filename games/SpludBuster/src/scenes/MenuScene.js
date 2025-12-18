class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    preload() {
        // Charger les assets nécessaires pour le menu
        this.load.image('background', 'assets/background.png');

        // Barre de chargement
        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(240, 270, 320, 50);

        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        const loadingText = this.make.text({
            x: width / 2,
            y: height / 2 - 50,
            text: 'Chargement...',
            style: {
                font: '20px monospace',
                fill: '#ffffff'
            }
        });
        loadingText.setOrigin(0.5, 0.5);

        const percentText = this.make.text({
            x: width / 2,
            y: height / 2,
            text: '0%',
            style: {
                font: '18px monospace',
                fill: '#ffffff'
            }
        });
        percentText.setOrigin(0.5, 0.5);

        // Gestion du chargement
        this.load.on('progress', (value) => {
            progressBar.clear();
            progressBar.fillStyle(0x4a90e2, 1);
            progressBar.fillRect(250, 280, 300 * value, 30);
            percentText.setText(parseInt(value * 100) + '%');
        });

        this.load.on('filecomplete', (key, type, data) => {
            console.log('Asset chargé:', key);
        });

        this.load.on('loaderror', (file) => {
            console.error('Erreur de chargement:', file.key);
        });

        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
            percentText.destroy();
        });
    }

    create() {
        const { width, height } = this.scale;

        // Fond moderne (Gris foncé bleuté)
        this.add.rectangle(0, 0, width, height, 0x111827).setOrigin(0);

        // Grille subtile en fond
        const grid = this.add.grid(width / 2, height / 2, width, height, 40, 40, 0x111827, 0, 0x1f2937, 0.1);

        // Titre du jeu - Style moderne sans contour épais
        this.title = this.add.text(width * 0.5, height * 0.2, 'SPUD BLASTER', {
            fontSize: '84px',
            fontFamily: 'Arial Black, sans-serif',
            fill: '#60A5FA', // Bleu clair moderne
            shadow: {
                offsetX: 0,
                offsetY: 4,
                color: '#1E3A8A',
                blur: 0,
                stroke: false,
                fill: true
            }
        }).setOrigin(0.5);

        // Animation du titre (plus subtile)
        this.tweens.add({
            targets: this.title,
            y: height * 0.2 - 10,
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Fonction pour créer un bouton moderne
        const createButton = (x, y, text, callback, color = 0x3B82F6) => {
            const btnWidth = 280;
            const btnHeight = 60;

            const container = this.add.container(x, y);

            // Ombre du bouton
            const shadow = this.add.rectangle(4, 4, btnWidth, btnHeight, 0x000000, 0.2)
                .setOrigin(0.5);

            // Fond du bouton
            const bg = this.add.rectangle(0, 0, btnWidth, btnHeight, color)
                .setOrigin(0.5);

            // Texte
            const label = this.add.text(0, 0, text, {
                fontSize: '24px',
                fontFamily: 'Arial, sans-serif',
                fill: '#ffffff',
                fontStyle: 'bold'
            }).setOrigin(0.5);

            container.add([shadow, bg, label]);

            // Zone interactive
            bg.setInteractive({ useHandCursor: true })
                .on('pointerdown', callback)
                .on('pointerover', () => {
                    this.tweens.add({
                        targets: container,
                        scaleX: 1.05,
                        scaleY: 1.05,
                        duration: 100
                    });
                    bg.setFillStyle(0x60A5FA); // Plus clair au survol
                })
                .on('pointerout', () => {
                    this.tweens.add({
                        targets: container,
                        scaleX: 1,
                        scaleY: 1,
                        duration: 100
                    });
                    bg.setFillStyle(color);
                });

            return container;
        };

        // Boutons
        createButton(width * 0.5, height * 0.40, 'SOLO', () => this.scene.start('CharacterSelectScene'), 0x10B981); // Vert pour solo
        createButton(width * 0.5, height * 0.50, 'ONLINE', () => this.scene.start('OnlineMenuScene'), 0x3B82F6); // Bleu pour online
        createButton(width * 0.5, height * 0.60, 'OPTIONS', () => this.scene.start('OptionsScene'), 0x4B5563); // Gris pour options
        createButton(width * 0.5, height * 0.70, 'QUITTER', () => {
            try { const { app } = require('electron'); app.quit(); } catch (e) { if (window.close) { window.close(); } }
        }, 0xEF4444); // Rouge pour quitter

        // Instructions discrètes
        this.add.text(width * 0.5, height * 0.9, 'Appuyez sur ESPACE pour commencer en solo', {
            fontSize: '16px',
            fontFamily: 'Arial, sans-serif',
            fill: '#9CA3AF' // Gris clair
        }).setOrigin(0.5);

        // Touche Espace ou Entrée pour jouer en solo
        this.input.keyboard.on('keydown-SPACE', () => { this.scene.start('CharacterSelectScene'); });
        this.input.keyboard.on('keydown-ENTER', () => { this.scene.start('CharacterSelectScene'); });
    }

    update() {
        // Plus d'animation de fond nécessaire
    }
}
