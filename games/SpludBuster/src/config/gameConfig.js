const gameConfig = {
    type: Phaser.AUTO,
    width: 960,
    height: 720,
    parent: 'phaser-game',
    backgroundColor: '#1b1f23',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 960,
        height: 720
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    }
};
