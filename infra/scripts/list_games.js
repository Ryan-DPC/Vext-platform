const axios = require('axios');

const BASE_URL = 'https://backend-ether.onrender.com/api';

async function listGames() {
    try {
        console.log('Fetching all games...');
        const res = await axios.get(`${BASE_URL}/games/all`);
        const games = res.data.games || res.data;

        console.log(`Found ${games.length} games:`);
        games.forEach(g => {
            console.log(`- [${g.folder_name}] ${g.game_name}`);
            console.log(`  GitHub: ${g.github_url}`);
        });

    } catch (e) {
        console.error('Error:', e.message);
    }
}

listGames();
