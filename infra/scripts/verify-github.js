const GitHubService = require('../backend/src/services/github.service');

async function testGitHub() {
    console.log('Testing GitHubService...');
    const service = new GitHubService();

    // Using facebook/react as it is popular and has releases
    const owner = 'facebook';
    const repo = 'react';

    try {
        console.log(`Step 1: Fetching latest release for ${owner}/${repo}...`);
        const start = Date.now();
        const release = await service.getLatestRelease(owner, repo);
        console.log(`Step 2: Fetch complete in ${Date.now() - start}ms`);

        if (release) {
            console.log('✅ Success!');
            console.log('Version:', release.version);
            console.log('Published At:', release.publishedAt);
            console.log('Download URL (zip):', release.downloadUrl || 'None (might be source code only)');
        } else {
            console.log('⚠️ No release found.');
        }

    } catch (error) {
        console.error('❌ Error testing GitHubService:', error.message);
        if (error.cause) console.error('Cause:', error.cause);
    }
}

testGitHub();
