const fs = require('fs').promises;
const path = require('path');

class SlugService {
    constructor() {
        // Adjust path to point to root games folder
        // Use environment variable or default to project root/games/slug.json
        this.slugPath = process.env.SLUG_PATH || path.join(process.cwd(), 'games', 'slug.json');

        // Ensure directory exists
        const dir = path.dirname(this.slugPath);
        require('fs').mkdirSync(dir, { recursive: true });
    }

    async loadSlug() {
        try {
            const content = await fs.readFile(this.slugPath, 'utf8');
            return JSON.parse(content);
        } catch (error) {
            if (error.code === 'ENOENT') {
                return {
                    games: {},
                    lastUpdated: new Date().toISOString()
                };
            }
            throw error;
        }
    }

    async saveSlug(slugData) {
        slugData.lastUpdated = new Date().toISOString();
        await fs.writeFile(
            this.slugPath,
            JSON.stringify(slugData, null, 2) + '\n',
            'utf8'
        );
    }

    async getGamePrice(slug) {
        const slugData = await this.loadSlug();
        return slugData.games[slug]?.price ?? 0;
    }

    async updateGamePrice(slug, price) {
        const slugData = await this.loadSlug();
        if (!slugData.games[slug]) {
            slugData.games[slug] = {
                slug,
                price: 0,
                enabled: true
            };
        }
        slugData.games[slug].price = parseFloat(price);
        await this.saveSlug(slugData);
        return slugData.games[slug];
    }

    async syncFromCloudinary(cloudinaryGames) {
        const slugData = await this.loadSlug();
        let updated = false;

        cloudinaryGames.forEach(game => {
            const slug = game.folder_name || game.slug;
            if (!slug) return;

            if (!slugData.games[slug]) {
                slugData.games[slug] = {
                    slug,
                    price: game.price || 0,
                    enabled: true,
                    gameName: game.game_name || game.name,
                    firstSeen: new Date().toISOString()
                };
                updated = true;
                console.log(`[SlugService] ✅ New game added: ${slug}`);
            } else {
                if (game.game_name && !slugData.games[slug].gameName) {
                    slugData.games[slug].gameName = game.game_name;
                    updated = true;
                }
            }
        });

        if (updated) {
            await this.saveSlug(slugData);
        }

        return slugData;
    }

    async getAllPrices() {
        const slugData = await this.loadSlug();
        const prices = {};
        Object.keys(slugData.games).forEach(slug => {
            if (slugData.games[slug].enabled) {
                prices[slug] = slugData.games[slug].price;
            }
        });
        return prices;
    }

    async getGameData(slug) {
        const slugData = await this.loadSlug();
        return slugData.games[slug] || null;
    }
}

module.exports = SlugService;
