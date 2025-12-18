require('dotenv').config({ path: '.env.server' });

const GitHubService = require('./backend/src/services/github.service');

async function main() {
    const service = new GitHubService();
    try {
        console.log('Testing with UA EtherLauncher/1.0');
        // We know the URL from previous step
        const url = "https://github.com/Ryan-DPC/Stick-Fighter/releases/download/v1.0.7/Stick-Fighter.Setup.1.0.0.exe"

        const res = await fetch(url, {
            headers: { 'User-Agent': 'EtherLauncher/1.0' }
        });
        console.log('Status with UA:', res.status);

        if (res.ok) {
            console.log('Download OK');
        } else {
            console.log('Download FAILED');
        }

        // Also test with standard UA
        console.log('Testing with Standard UA');
        const res2 = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        console.log('Status with Std UA:', res2.status);

    } catch (e) {
        console.error('Error:', e.message);
    }
}

main();
