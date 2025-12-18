class ShopScene extends Phaser.Scene {
    constructor() {
        super({ key: 'ShopScene' });
    }

    init(data) {
        this.gameScene = data.gameScene;
        this.wave = data.wave;
        this.gold = data.gold;
        this.inventory = data.inventory; // Récupérer l'inventaire
    }

    create() {
        const { width, height } = this.scale;

        // --- CONSTANTES DE LAYOUT RESPONSIVE ---
        const padding = width * 0.03;
        const headerHeight = height * 0.15;
        const footerHeight = height * 0.12;
        const mainContentHeight = height - headerHeight - footerHeight - (padding * 2);

        // Zones principales
        const itemsAreaWidth = (width - (padding * 3)) * 0.55; // 55% pour les items
        const statsAreaWidth = (width - (padding * 3)) * 0.45; // 45% pour stats + armes

        const itemsAreaX = padding;
        const itemsAreaY = headerHeight + padding;

        const statsAreaX = itemsAreaX + itemsAreaWidth + padding;
        const statsAreaY = itemsAreaY;

        // Sauvegarder pour usage ultérieur
        this.layout = {
            itemsArea: { x: itemsAreaX, y: itemsAreaY, w: itemsAreaWidth, h: mainContentHeight },
            statsArea: { x: statsAreaX, y: statsAreaY, w: statsAreaWidth, h: mainContentHeight }
        };

        // --- FOND ---
        this.add.rectangle(0, 0, width, height, 0x111827).setOrigin(0);
        this.add.grid(width / 2, height / 2, width, height, 40, 40, 0x111827, 0, 0x1f2937, 0.1);

        // --- HEADER ---
        this.add.text(width * 0.5, headerHeight * 0.4, `BOUTIQUE`, {
            fontSize: `${Math.min(48, height * 0.06)}px`,
            fontFamily: 'Arial Black, sans-serif',
            fill: '#60A5FA',
        }).setOrigin(0.5);

        this.add.text(width * 0.5, headerHeight * 0.75, `Vague ${this.wave} terminée`, {
            fontSize: `${Math.min(20, height * 0.03)}px`,
            fontFamily: 'Arial, sans-serif',
            fill: '#9CA3AF',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // --- OR & REROLL (Coin supérieur droit) ---
        const topControlsX = width - padding;
        const topControlsY = headerHeight * 0.5;

        // Or
        const goldText = this.add.text(topControlsX, topControlsY - 15, `💰 ${this.gold} G`, {
            fontSize: `${Math.min(24, height * 0.035)}px`,
            fontFamily: 'Arial, sans-serif',
            fill: '#F59E0B',
            fontStyle: 'bold'
        }).setOrigin(1, 0.5);
        this.goldText = goldText;

        // Bouton Reroll
        const rerollBtn = this.add.container(topControlsX, topControlsY + 20);
        const rerollBg = this.add.rectangle(-80, 0, 160, 30, 0x374151)
            .setInteractive({ useHandCursor: true });
        const rerollText = this.add.text(-80, 0, '🔄 Reroll (5 G)', {
            fontSize: '14px',
            fontFamily: 'Arial, sans-serif',
            fill: '#D1D5DB',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        rerollBtn.add([rerollBg, rerollText]);

        rerollBg.on('pointerdown', () => {
            if (this.gold >= 5) {
                this.gold -= 5;
                this.updateGoldDisplay();
                this.generateItems();
            }
        })
            .on('pointerover', () => rerollBg.setFillStyle(0x4B5563))
            .on('pointerout', () => rerollBg.setFillStyle(0x374151));

        // --- SECTION ITEMS ---
        this.add.rectangle(itemsAreaX, itemsAreaY, itemsAreaWidth, mainContentHeight, 0x1F2937, 0.5)
            .setOrigin(0)
            .setStrokeStyle(1, 0x374151);

        this.add.text(itemsAreaX + itemsAreaWidth / 2, itemsAreaY - 25, 'OBJETS DISPONIBLES', {
            fontSize: '18px',
            fontFamily: 'Arial, sans-serif',
            fill: '#60A5FA',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.itemsContainer = this.add.container(0, 0);
        this.generateItems();

        // --- SECTION DROITE (STATS + ARMES) ---
        this.add.rectangle(statsAreaX, statsAreaY, statsAreaWidth, mainContentHeight, 0x1F2937, 0.5)
            .setOrigin(0)
            .setStrokeStyle(1, 0x374151);

        // Titre Armes
        this.add.text(statsAreaX + statsAreaWidth / 2, statsAreaY + 20, 'VOS ARMES', {
            fontSize: '18px',
            fontFamily: 'Arial, sans-serif',
            fill: '#F59E0B',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Conteneur Armes
        this.weaponsContainer = this.add.container(0, 0);
        this.updateWeaponsDisplay();

        // Titre Stats (plus bas)
        const statsTitleY = statsAreaY + (mainContentHeight * 0.4);
        this.add.text(statsAreaX + statsAreaWidth / 2, statsTitleY, 'VOS STATISTIQUES', {
            fontSize: '18px',
            fontFamily: 'Arial, sans-serif',
            fill: '#10B981',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.createStatsDisplay(statsTitleY + 30);

        // --- BOUTON NEXT WAVE (Footer) ---
        const nextWaveContainer = this.add.container(width * 0.5, height - (footerHeight * 0.5));
        const btnW = Math.min(300, width * 0.4);
        const btnH = Math.min(60, footerHeight * 0.6);

        const nextWaveBg = this.add.rectangle(0, 0, btnW, btnH, 0x10B981)
            .setInteractive({ useHandCursor: true });

        const nextWaveText = this.add.text(0, 0, 'VAGUE SUIVANTE ▶', {
            fontSize: `${Math.min(24, btnH * 0.5)}px`,
            fontFamily: 'Arial, sans-serif',
            fill: '#FFFFFF',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        nextWaveContainer.add([nextWaveBg, nextWaveText]);

        nextWaveBg.on('pointerdown', () => this.nextWave())
            .on('pointerover', () => {
                nextWaveBg.setFillStyle(0x34D399);
                this.tweens.add({ targets: nextWaveContainer, scaleX: 1.05, scaleY: 1.05, duration: 100 });
            })
            .on('pointerout', () => {
                nextWaveBg.setFillStyle(0x10B981);
                this.tweens.add({ targets: nextWaveContainer, scaleX: 1, scaleY: 1, duration: 100 });
            });
    }

    updateWeaponsDisplay() {
        this.weaponsContainer.removeAll(true);
        const { x, y, w } = this.layout.statsArea;

        const slotSize = 64;
        const spacing = 15;
        const totalW = (slotSize * 4) + (spacing * 3);
        const startX = x + (w - totalW) / 2 + slotSize / 2;
        const startY = y + 80;

        // Afficher les 4 slots
        for (let i = 0; i < MAX_WEAPONS; i++) {
            const slotX = startX + i * (slotSize + spacing);

            // Fond du slot
            const slotBg = this.add.rectangle(slotX, startY, slotSize, slotSize, 0x374151)
                .setStrokeStyle(2, 0x4B5563);
            this.weaponsContainer.add(slotBg);

            // Arme si présente
            if (this.inventory[i]) {
                const weapon = this.inventory[i];
                const tierInfo = WEAPON_TIERS[weapon.tier];

                // Bordure de rareté
                slotBg.setStrokeStyle(3, tierInfo.color);

                // Icône
                const icon = this.add.image(slotX, startY, `weaponIcon_${weapon.key}`)
                    .setDisplaySize(48, 48);
                this.weaponsContainer.add(icon);

                // Niveau (Tier + 1)
                const lvlText = this.add.text(slotX + 20, startY + 20, `L${weapon.tier + 1}`, {
                    fontSize: '12px',
                    fontFamily: 'Arial, sans-serif',
                    fill: '#FFFFFF',
                    backgroundColor: '#000000',
                    padding: { x: 2, y: 2 }
                }).setOrigin(0.5);
                this.weaponsContainer.add(lvlText);
            }
        }
    }

    createStatsDisplay(startY) {
        const { x, w, h } = this.layout.statsArea;
        const stats = this.gameScene.playerStats || {};

        const statList = [
            { label: 'Dégâts', value: stats.damage || 0, color: '#F87171', icon: '⚔️' },
            { label: 'Vitesse', value: stats.speed || 0, color: '#2DD4BF', icon: '⚡' },
            { label: 'PV Max', value: stats.maxHealth || 20, color: '#F87171', icon: '❤️' },
            { label: 'Régén', value: stats.regen || 0, color: '#34D399', icon: '💚' },
            { label: 'Critique', value: (stats.critChance || 0) + '%', color: '#FBBF24', icon: '✨' }
        ];

        const itemHeight = 40;

        statList.forEach((stat, index) => {
            const currentY = startY + index * itemHeight;
            const centerX = x + w / 2;

            // Ligne de stat
            this.add.rectangle(centerX, currentY, w * 0.9, itemHeight * 0.8, 0x374151, 0.5)
                .setStrokeStyle(1, 0x4B5563);

            this.add.text(x + 20, currentY, `${stat.icon} ${stat.label}`, {
                fontSize: '16px',
                fontFamily: 'Arial, sans-serif',
                fill: '#E5E7EB',
            }).setOrigin(0, 0.5);

            this.add.text(x + w - 20, currentY, String(stat.value), {
                fontSize: '16px',
                fontFamily: 'monospace',
                fill: stat.color,
                fontStyle: 'bold'
            }).setOrigin(1, 0.5);
        });
    }

    generateItems() {
        this.itemsContainer.removeAll(true);

        // Mélange d'items de stats et d'armes
        const statItems = [
            { type: 'stat', name: 'Pomme', stat: 'maxHealth', value: 5, cost: 15, desc: '+5 PV Max', color: 0xF87171, icon: '🍎' },
            { type: 'stat', name: 'Café', stat: 'speed', value: 10, cost: 20, desc: '+10 Vitesse', color: 0x2DD4BF, icon: '☕' },
            { type: 'stat', name: 'Haltère', stat: 'damage', value: 2, cost: 25, desc: '+2 Dégâts', color: 0xF87171, icon: '🏋️' },
            { type: 'stat', name: 'Lunettes', stat: 'critChance', value: 5, cost: 30, desc: '+5% Critique', color: 0xFBBF24, icon: '👓' },
            { type: 'stat', name: 'Bandage', stat: 'regen', value: 1, cost: 20, desc: '+1 Régén/5s', color: 0x34D399, icon: '🩹' }
        ];

        // Générer 4 items
        for (let i = 0; i < 4; i++) {
            // 30% de chance d'avoir une arme
            if (Math.random() < 0.3) {
                const weaponKey = Phaser.Utils.Array.GetRandom(POOL_WEAPONS);
                // Rareté basée sur la vague (simple pour l'instant)
                let tier = 0;
                if (this.wave > 5 && Math.random() > 0.8) tier = 1;

                const item = {
                    type: 'weapon',
                    key: weaponKey,
                    tier: tier,
                    name: weaponKey, // À améliorer avec getWeaponName
                    cost: 40 + (tier * 40),
                    desc: `Arme ${WEAPON_TIERS[tier].label}`,
                    color: WEAPON_TIERS[tier].color,
                    icon: '⚔️'
                };
                this.createItemCard(i, item);
            } else {
                const item = Phaser.Utils.Array.GetRandom(statItems);
                this.createItemCard(i, item);
            }
        }
    }

    createItemCard(index, item) {
        const { x, y, w, h } = this.layout.itemsArea;

        const cols = 2;
        const rows = 2;
        const col = index % cols;
        const row = Math.floor(index / cols);
        const padding = 10;
        const cardWidth = (w - (padding * 3)) / cols;
        const cardHeight = (h - (padding * 3)) / rows;
        const cardX = x + padding + (col * (cardWidth + padding)) + cardWidth / 2;
        const cardY = y + padding + (row * (cardHeight + padding)) + cardHeight / 2;

        const bg = this.add.rectangle(cardX, cardY, cardWidth, cardHeight, 0x1F2937)
            .setStrokeStyle(1, item.color || 0x4B5563);
        this.itemsContainer.add(bg);

        // Header
        const headerH = cardHeight * 0.25;
        const headerBg = this.add.rectangle(cardX, cardY - cardHeight / 2 + headerH / 2, cardWidth, headerH, 0x374151);
        this.itemsContainer.add(headerBg);

        // Nom
        this.itemsContainer.add(this.add.text(cardX, cardY - cardHeight / 2 + headerH / 2, item.name, {
            fontSize: `${Math.min(16, headerH * 0.6)}px`,
            fontFamily: 'Arial, sans-serif',
            fill: '#F3F4F6',
            fontStyle: 'bold'
        }).setOrigin(0.5));

        // Description
        this.itemsContainer.add(this.add.text(cardX, cardY, item.desc, {
            fontSize: `${Math.min(14, cardHeight * 0.1)}px`,
            fontFamily: 'Arial, sans-serif',
            fill: '#' + (item.color || 0xFFFFFF).toString(16).padStart(6, '0'),
            align: 'center'
        }).setOrigin(0.5));

        // Bouton Achat
        const btnH = Math.min(40, cardHeight * 0.2);
        const btnW = cardWidth * 0.8;
        const btnY = cardY + cardHeight / 2 - btnH - 10;

        const buyBtn = this.add.rectangle(cardX, btnY, btnW, btnH, 0x3B82F6)
            .setInteractive({ useHandCursor: true });

        const priceText = this.add.text(cardX, btnY, `${item.cost} G`, {
            fontSize: `${Math.min(18, btnH * 0.6)}px`,
            fontFamily: 'Arial, sans-serif',
            fill: '#FFFFFF',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.itemsContainer.add([buyBtn, priceText]);

        buyBtn.on('pointerdown', () => {
            if (this.gold >= item.cost) {
                // Vérifier si inventaire plein pour les armes
                if (item.type === 'weapon' && this.inventory.length >= MAX_WEAPONS) {
                    // TODO: Feedback visuel "Inventaire plein"
                    return;
                }

                this.gold -= item.cost;
                this.updateGoldDisplay();

                if (item.type === 'weapon') {
                    this.addWeapon(item);
                } else {
                    this.applyStatItem(item);
                }

                buyBtn.disableInteractive();
                buyBtn.setFillStyle(0x111827);
                priceText.setText('ACHETÉ');
                priceText.setFill('#10B981');
                bg.setStrokeStyle(2, 0x10B981);
            }
        });
    }

    addWeapon(item) {
        // Ajouter à l'inventaire
        this.inventory.push({
            key: item.key,
            tier: item.tier,
            lastShot: 0,
            cooldown: 1200
        });

        // Tenter une fusion
        this.checkFusion();
        this.updateWeaponsDisplay();
    }

    checkFusion() {
        // Regrouper par clé et tier
        const groups = {};
        this.inventory.forEach(w => {
            const id = `${w.key}_${w.tier}`;
            if (!groups[id]) groups[id] = [];
            groups[id].push(w);
        });

        let fused = false;
        for (const id in groups) {
            if (groups[id].length >= 2) {
                const w1 = groups[id][0];
                const w2 = groups[id][1];

                // Vérifier si tier max atteint
                if (w1.tier >= 3) continue;

                // Retirer les 2 armes
                const idx1 = this.inventory.indexOf(w1);
                this.inventory.splice(idx1, 1);
                const idx2 = this.inventory.indexOf(w2);
                this.inventory.splice(idx2, 1);

                // Ajouter l'arme de tier supérieur
                this.inventory.push({
                    key: w1.key,
                    tier: w1.tier + 1,
                    lastShot: 0,
                    cooldown: 1200
                });

                fused = true;
                // Feedback visuel de fusion (à faire)
                break; // Une fusion à la fois pour simplifier
            }
        }

        if (fused) this.checkFusion(); // Récursif pour fusion en chaîne
    }

    applyStatItem(item) {
        if (!this.gameScene.playerStats) this.gameScene.playerStats = {};
        if (!this.gameScene.playerStats[item.stat]) this.gameScene.playerStats[item.stat] = 0;

        if (item.stat === 'maxHealth') {
            this.gameScene.playerStats.maxHealth = (this.gameScene.playerStats.maxHealth || 20) + item.value;
            this.gameScene.player.health += item.value;
            this.gameScene.events.emit('updateHP', this.gameScene.player.health, this.gameScene.playerStats.maxHealth);
        } else if (item.stat === 'speed') {
            this.gameScene.settings.playerSpeed += item.value;
            this.gameScene.playerStats.speed = this.gameScene.settings.playerSpeed;
        } else {
            this.gameScene.playerStats[item.stat] += item.value;
        }

        // Rafraîchir l'affichage stats
        this.createStatsDisplay(this.layout.statsArea.y + (this.layout.statsArea.h * 0.4) + 30);
    }

    updateGoldDisplay() {
        this.goldText.setText(`💰 ${this.gold} G`);
        this.gameScene.totalGold = this.gold;
        this.gameScene.events.emit('updateGold', this.gold);
    }

    nextWave() {
        this.scene.stop();
        this.gameScene.startNextWave();
    }
}
