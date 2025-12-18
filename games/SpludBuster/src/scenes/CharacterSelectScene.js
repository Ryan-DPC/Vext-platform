class CharacterSelectScene extends Phaser.Scene {
    constructor() {
        super({ key: 'CharacterSelectScene' });
    }

    preload() {
        this.load.image('background', 'assets/background.png');
        this.load.image('characterPortrait', 'assets/character/SPRITE_PORTRAIT.png');
        this.load.spritesheet('characterSheet', 'assets/character/SPRITE_SHEET.png', {
            frameWidth: 32,
            frameHeight: 32
        });

        // Charger toutes les armes
        // Charger toutes les armes (Starter + Pool)
        WEAPONS.forEach(weapon => {
            this.load.image(`weapon_${weapon}`, `assets/weapon/${weapon}.png`);
            this.load.image(`weaponIcon_${weapon}`, `assets/weapon/Icons/${weapon}.png`);
        });
    }

    create() {
        const { width, height } = this.scale;

        // Fond animé
        this.background = this.add.tileSprite(0, 0, 960, 720, 'background');
        this.background.setOrigin(0, 0);
        this.background.setTileScale(0.5, 0.5);

        // Titre
        this.title = this.add.text(width * 0.5, height * 0.1, 'SÉLECTION', {
            fontSize: '56px',
            fill: '#4a90e2',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 8
        }).setOrigin(0.5);

        // Portrait du personnage
        this.add.text(width * 0.5, height * 0.22, 'Personnage', {
            fontSize: '28px',
            fill: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        const portrait = this.add.image(width * 0.5, height * 0.28, 'characterPortrait');
        portrait.setScale(2);

        // Aperçu animé du personnage
        const characterPreview = this.add.sprite(width * 0.5, height * 0.39, 'characterSheet', 0);
        characterPreview.setScale(2);

        // Animation du personnage
        this.anims.create({
            key: 'characterIdle',
            frames: this.anims.generateFrameNumbers('characterSheet', { start: 0, end: 3 }),
            frameRate: 6,
            repeat: -1
        });
        characterPreview.play('characterIdle');

        // Sélection d'arme
        this.add.text(480, 340, 'Choisissez votre arme', {
            fontSize: '28px',
            fill: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        this.selectedWeapon = localStorage.getItem('selectedWeapon') || 'Sword01';
        this.weaponButtons = [];

        // Créer une grille d'icônes d'armes (Starter uniquement)
        const cols = 3;
        const startX = width * 0.35;
        const startY = height * 0.55;
        const spacing = width * 0.15;

        STARTER_WEAPONS.forEach((weapon, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            const x = startX + col * spacing;
            const y = startY + row * spacing;

            const isSelected = weapon === this.selectedWeapon;
            const button = this.add.image(x, y, `weaponIcon_${weapon}`)
                .setInteractive({ useHandCursor: true })
                .setScale(isSelected ? 1.2 : 1.0)
                .setTint(isSelected ? 0xffffff : 0x888888)
                .on('pointerdown', () => {
                    this.selectWeapon(weapon);
                })
                .on('pointerover', () => {
                    button.setScale(1.1);
                })
                .on('pointerout', () => {
                    const scale = weapon === this.selectedWeapon ? 1.2 : 1.0;
                    button.setScale(scale);
                });

            // Bordure pour l'arme sélectionnée
            if (isSelected) {
                const border = this.add.rectangle(x, y, 48, 48, 0x000000, 0);
                border.setStrokeStyle(3, 0x4a90e2);
                button.border = border;
            }

            this.weaponButtons.push({ weapon, button, x, y });
        });

        // Afficher le nom de l'arme sélectionnée
        this.weaponNameText = this.add.text(width * 0.5, height * 0.8, this.getWeaponName(this.selectedWeapon), {
            fontSize: '24px',
            fill: '#4a90e2',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        // Bouton Commencer
        this.startButton = this.add.rectangle(width * 0.5, height * 0.9, 300, 50, 0x4a90e2)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => { this.startGame(); })
            .on('pointerover', () => { this.startButton.setFillStyle(0x5aa0f2); this.startButton.setScale(1.05); })
            .on('pointerout', () => { this.startButton.setFillStyle(0x4a90e2); this.startButton.setScale(1); });

        this.add.text(width * 0.5, height * 0.9, 'COMMENCER', {
            fontSize: '28px',
            fill: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        // Bouton Retour
        this.backButton = this.add.rectangle(width * 0.104, height * 0.9, 150, 40, 0x666666)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => { this.scene.start('MenuScene'); })
            .on('pointerover', () => { this.backButton.setFillStyle(0x777777); this.backButton.setScale(1.05); })
            .on('pointerout', () => { this.backButton.setFillStyle(0x666666); this.backButton.setScale(1); });

        this.add.text(width * 0.104, height * 0.9, 'RETOUR', {
            fontSize: '20px',
            fill: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);

        // Touche Entrée pour commencer
        this.input.keyboard.on('keydown-ENTER', () => {
            this.startGame();
        });
        this.input.keyboard.on('keydown-SPACE', () => {
            this.startGame();
        });
    }

    selectWeapon(weapon) {
        this.selectedWeapon = weapon;
        localStorage.setItem('selectedWeapon', weapon);

        // Mettre à jour les boutons
        this.weaponButtons.forEach(({ weapon: w, button, x, y }) => {
            const isSelected = w === weapon;
            button.setScale(isSelected ? 1.2 : 1.0);
            button.setTint(isSelected ? 0xffffff : 0x888888);

            // Mettre à jour la bordure
            if (button.border) {
                button.border.destroy();
                button.border = null;
            }
            if (isSelected) {
                const border = this.add.rectangle(x, y, 48, 48, 0x000000, 0);
                border.setStrokeStyle(3, 0x4a90e2);
                button.border = border;
            }
        });

        // Mettre à jour le nom
        this.weaponNameText.setText(this.getWeaponName(weapon));
    }

    getWeaponName(weapon) {
        const names = {
            'Bow02': 'Arc',
            'Club01': 'Massue',
            'EnergySword01': 'Épée Énergétique',
            'Hammer01': 'Marteau',
            'Knife01': 'Couteau',
            'Mace01': 'Fléau',
            'Scimitar01': 'Cimeterre',
            'Scythe01': 'Faux',
            'Shuriken01': 'Shuriken',
            'Sling01': 'Fronde',
            'Spear01': 'Lance',
            'Staff01': 'Bâton',
            'Sword01': 'Épée',
            'ThrowingAxe01': 'Hache de Lancer',
            'Wand01': 'Baguette'
        };
        return names[weapon] || weapon;
    }

    startGame() {
        this.scene.start('GameScene');
    }

    update() {
        // Animation du fond
        this.background.tilePositionX += 0.5;
        this.background.tilePositionY += 0.5;
    }
}
