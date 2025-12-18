// Initialisation du jeu
if (typeof Phaser !== 'undefined') {
    console.log('Initialisation du jeu Phaser...');

    // Ajouter les scènes à la configuration
    const config = {
        ...gameConfig,
        scene: [MenuScene, OptionsScene, CharacterSelectScene, OnlineMenuScene, LobbyScene, GameScene, UIScene, ShopScene, PauseScene]
    };

    const game = new Phaser.Game(config);

    // Cacher/afficher le titre selon la scène
    game.events.on('ready', () => {
        const titleElement = document.querySelector('h1');

        // Écouter les changements de scène pour toutes les scènes
        ['MenuScene', 'OptionsScene', 'CharacterSelectScene', 'OnlineMenuScene', 'LobbyScene', 'GameScene', 'PauseScene'].forEach(sceneName => {
            const scene = game.scene.getScene(sceneName);
            if (scene) {
                scene.events.on('start', () => {
                    if (sceneName === 'GameScene') {
                        // Cacher le titre pendant le jeu
                        if (titleElement) titleElement.style.display = 'none';
                    } else {
                        // Afficher le titre dans les autres scènes
                        if (titleElement) titleElement.style.display = 'block';
                    }
                });
            }
        });
    });
} else {
    console.error('Phaser n\'est pas chargé !');
    // Afficher un message d'erreur dans le DOM
    if (document.getElementById('phaser-game')) {
        document.getElementById('phaser-game').innerHTML = '<p style="color: white; text-align: center; padding: 20px;">Erreur: Phaser n\'est pas chargé. Vérifiez que node_modules/phaser existe.</p>';
    }
}
