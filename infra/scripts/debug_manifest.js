const axios = require('axios');

const BASE_URL = 'https://backend-ether.onrender.com/api';

async function debugGames() {
    try {
        console.log('Fetching all games...');
        const res = await axios.get(`${BASE_URL}/games/all`);
        const games = res.data.games || res.data; // Handle array or {games: [...]}

        console.log(`Found ${games.length} games.`);

        const targetGame = games.find(g => g.folder_name === 'stick-fighter');

        if (!targetGame) {
            console.error('❌ Could not find "Stick Fighting" in game list.');
            games.forEach(g => console.log(` - ${g.game_name} (${g.folder_name})`));
            return;
        }

        console.log(`✅ Found Target Game: ${targetGame.game_name}`);
        console.log(`Type: ${typeof targetGame}`);
        console.log(`Slug/Folder: ${targetGame.folder_name}`);
        console.log(`ID: ${targetGame._id}`);
        console.log(`GitHub URL: ${targetGame.github_url}`);
        console.log('---');

        // Fetch Manifest
        const slug = targetGame.folder_name;
        console.log(`Fetching manifest for: ${slug}...`);
        try {
            const manifestRes = await axios.get(`${BASE_URL}/games/${slug}/manifest`);
            console.log('Manifest Response:', JSON.stringify(manifestRes.data, null, 2));
        } catch (e) {
            console.error('❌ Failed to fetch manifest:', e.response ? e.response.status : e.message);
            if (e.response.data) console.error(e.response.data);
        }

    } catch (e) {
        console.error('Error:', e.message);
    }
}

debugGames();
