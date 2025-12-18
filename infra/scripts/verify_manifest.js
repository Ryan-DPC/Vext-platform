// using global fetch

async function main() {
    try {
        const CACHE_BUST = Date.now();
        console.log('Fetching manifest from PROD (stick-fighter)...');

        let manifestRes = await fetch(`https://backend-ether.onrender.com/api/games/stick-fighter/manifest?t=${CACHE_BUST}`);

        if (!manifestRes.ok) {
            console.log('stick-fighter failed, trying "Stick Fighting"');
            manifestRes = await fetch(`https://backend-ether.onrender.com/api/games/Stick%20Fighting/manifest?t=${CACHE_BUST}`);
        }

        console.log('Manifest Status:', manifestRes.status);
        const data = await manifestRes.json();
        console.log('Manifest Data:', JSON.stringify(data, null, 2));

        if (data.downloadUrl) {
            console.log('Testing Download URL:', data.downloadUrl);
            const dlRes = await fetch(data.downloadUrl, { method: 'HEAD' });
            console.log('Download URL Status:', dlRes.status);

            if (dlRes.status !== 200) {
                // Try GET if HEAD not supported
                const getRes = await fetch(data.downloadUrl, { method: 'GET', headers: { Range: 'bytes=0-100' } });
                console.log('Download URL GET Status:', getRes.status);
                const text = await getRes.text();
                console.log('Download URL Preview:', text.substring(0, 100));
            }
        } else {
            console.log('No downloadUrl found!');
        }

    } catch (e) {
        console.error('Error:', e);
    }
}

main();
