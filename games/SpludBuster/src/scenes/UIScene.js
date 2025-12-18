class UIScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UIScene' });
    }

    create() {
        const { width, height } = this.scale;

        // UI - Score en haut à gauche (plus de marge)
        this.scoreText = this.add.text(20, 20, 'Score: 0', {
            fontSize: '22px',
            fill: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        });

        // UI - Gold en haut à gauche sous le score
        this.goldText = this.add.text(20, 50, 'Gold: 0', {
            fontSize: '22px',
            fill: '#ffff00',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        });

        // ===== BARRE D'EXPÉRIENCE (horizontale en haut au centre) =====
        const expBarWidth = 400;
        const expBarHeight = 24;
        const expBarX = width * 0.5; // Centre dynamique
        const expBarY = 30; // Plus bas (était 15)

        // Fond de la barre d'XP
        this.expBarBg = this.add.rectangle(expBarX, expBarY, expBarWidth, expBarHeight, 0x1a1a2e);
        this.expBarBg.setStrokeStyle(3, 0x16213e);

        // Barre d'XP remplie (cyan/bleu)
        this.expBar = this.add.rectangle(
            expBarX - expBarWidth / 2,
            expBarY,
            0, // Commence vide
            expBarHeight - 4,
            0x0f4c75
        );
        this.expBar.setOrigin(0, 0.5);

        // Indicateurs de paliers (niveaux) - 10 segments
        for (let i = 1; i < 10; i++) {
            const markerX = expBarX - expBarWidth / 2 + (expBarWidth / 10) * i;
            this.add.rectangle(markerX, expBarY, 2, expBarHeight, 0x3282b8);
        }

        // Texte niveau au centre de la barre
        this.levelText = this.add.text(expBarX, expBarY, 'LVL 1', {
            fontSize: '16px',
            fill: '#bbe1fa',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);

        // ===== BARRE DE VIE (rouge, sous la barre d'XP) =====
        const healthBarWidth = 400;
        const healthBarHeight = 20;
        const healthBarX = width * 0.5; // Centre dynamique
        const healthBarY = 60; // Plus bas (était 45)

        // Fond de la barre de vie
        this.healthBarBg = this.add.rectangle(healthBarX, healthBarY, healthBarWidth, healthBarHeight, 0x2d0a0a);
        this.healthBarBg.setStrokeStyle(2, 0x4a0e0e);

        // Barre de vie remplie (rouge → vert selon %)
        this.healthBar = this.add.rectangle(
            healthBarX - healthBarWidth / 2,
            healthBarY,
            healthBarWidth - 4,
            healthBarHeight - 4,
            0xff0000
        );
        this.healthBar.setOrigin(0, 0.5);

        // Texte HP sur la barre
        this.healthText = this.add.text(healthBarX, healthBarY, '20 / 20', {
            fontSize: '14px',
            fill: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);

        // UI - Game Over (caché initialement)
        this.gameOverText = this.add.text(480, 300, 'GAME OVER', {
            fontSize: '64px',
            fill: '#ff0000',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5).setVisible(false);

        this.gameStatsText = this.add.text(480, 380, '', {
            fontSize: '20px',
            fill: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center'
        }).setOrigin(0.5).setVisible(false);

        this.restartText = this.add.text(480, 450, 'Appuyez sur R pour recommencer\\nou M pour le menu', {
            fontSize: '24px',
            fill: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center'
        }).setOrigin(0.5).setVisible(false);

        // Écouter les événements de la scène de jeu
        const gameScene = this.scene.get('GameScene');

        gameScene.events.on('updateScore', (score) => {
            this.scoreText.setText('Score: ' + score);
        });

        gameScene.events.on('updateGold', (gold) => {
            this.goldText.setText('Gold: ' + gold);
        });

        gameScene.events.on('updateHP', (current, max) => {
            this.updateHealthBar(current, max);
        });

        gameScene.events.on('updateXP', (current, max) => {
            this.updateExpBar(current, max);
        });

        gameScene.events.on('levelUp', (level) => {
            this.levelText.setText(`LVL ${level}`);
            // Flash effect on level up
            this.cameras.main.flash(200, 0, 150, 255);
        });

        gameScene.events.on('gameOver', (stats) => {
            this.gameOverText.setVisible(true);
            this.gameStatsText.setText(
                `Score: ${stats.score}\\n` +
                `EXP Totale: ${stats.totalExp}\\n` +
                `Gold Total: ${stats.totalGold}`
            );
            this.gameStatsText.setVisible(true);
            this.restartText.setVisible(true);
        });

        // Initial update
        this.updateHealthBar(20, 20);

        // UI - Timer Vague (Haut Centre)
        this.waveTimerText = this.add.text(this.scale.width * 0.5, 120, '60', {
            fontSize: '32px',
            fill: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        // UI - Compteur Vague (Haut Droite)
        this.waveCounterText = this.add.text(this.scale.width - 20, 20, 'Vague 1', {
            fontSize: '24px',
            fill: '#aaaaaa',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(1, 0);

        gameScene.events.on('updateWaveTime', (time) => {
            this.waveTimerText.setText(time);
            // Rouge si < 10s
            if (time <= 10) this.waveTimerText.setFill('#ff0000');
            else this.waveTimerText.setFill('#ffffff');
        });

        gameScene.events.on('updateWaveNumber', (wave) => {
            this.waveCounterText.setText(`Vague ${wave}`);
        });
    }

    updateHealthBar(current, max) {
        let healthPercent = Math.max(0, current / max);
        const maxWidth = 396;
        this.healthBar.width = maxWidth * healthPercent;

        if (healthPercent > 0.6) {
            this.healthBar.setFillStyle(0x00ff00);
        } else if (healthPercent > 0.3) {
            this.healthBar.setFillStyle(0xff9900);
        } else {
            this.healthBar.setFillStyle(0xff0000);
        }

        this.healthText.setText(`${Math.max(0, Math.round(current))} / ${max}`);
    }

    updateExpBar(current, max) {
        let expPercent = Math.max(0, current / max);
        const maxWidth = 396;
        this.expBar.width = maxWidth * expPercent;
    }
}
