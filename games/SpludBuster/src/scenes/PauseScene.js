class PauseScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PauseScene' });
    }

    create() {
        // Overlay semi-transparent
        this.add.rectangle(480, 360, 960, 720, 0x000000, 0.7);

        // Texte PAUSE
        this.add.text(480, 300, 'PAUSE', {
            fontSize: '64px',
            fill: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);

        // Instructions
        this.add.text(480, 400, 'Appuyez sur Échap pour reprendre', {
            fontSize: '24px',
            fill: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        // Reprendre avec Échap
        this.input.keyboard.on('keydown-ESC', () => {
            this.scene.stop();
            this.scene.resume('GameScene');
        });
    }
}
