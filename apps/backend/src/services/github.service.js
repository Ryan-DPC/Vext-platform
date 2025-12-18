const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { Readable } = require('stream');
const pipeline = promisify(require('stream').pipeline);

class GitHubService {
    constructor() {
        this.baseUrl = 'https://api.github.com';
    }

    /**
     * Parse a GitHub URL to extract owner and repo
     * @param {string} url - e.g. "https://github.com/ryand/ether-game-chess"
     * @returns {{owner: string, repo: string}|null}
     */
    parseUrl(url) {
        if (!url) return null;
        const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
        if (match) {
            return { owner: match[1], repo: match[2].replace('.git', '') };
        }
        return null;
    }

    /**
     * Get the latest release for a repository
     * @param {string} owner 
     * @param {string} repo 
     * @returns {Promise<Object>} Release info including tag_name (version) and assets
     */
    async getLatestRelease(owner, repo) {
        try {
            const response = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/releases/latest`, {
                headers: {
                    'Accept': 'application/vnd.github.v3+json',
                    'Authorization': process.env.GITHUB_TOKEN ? `token ${process.env.GITHUB_TOKEN}` : undefined
                }
            });

            if (!response.ok) {
                if (response.status === 404) {
                    console.warn(`[GitHub] No releases found for ${owner}/${repo}`);
                    return null;
                }
                throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            // Find zip or executable
            const zipAsset = data.assets.find(a =>
                a.name.endsWith('.zip') ||
                a.content_type === 'application/zip' ||
                a.name.endsWith('.exe')
            );

            return {
                version: data.tag_name,
                downloadUrl: zipAsset ? zipAsset.browser_download_url : null,
                publishedAt: data.published_at,
                changelog: data.body,
                assets: data.assets
            };
        } catch (error) {
            console.error(`[GitHub] Error fetching release for ${owner}/${repo}:`, error.message);
            throw error;
        }
    }
    /**
     * Get raw file content from repository
     * @param {string} owner
     * @param {string} repo
     * @param {string} filePath - File path in repo (e.g. "metadata.json")
     * @param {string} ref - Branch or commit hash (default: "main")
     * @returns {Promise<Buffer|null>}
     */
    async getRawFile(owner, repo, filePath, ref = 'main') {
        try {
            const url = `${this.baseUrl}/repos/${owner}/${repo}/contents/${filePath}?ref=${ref}`;
            const response = await fetch(url, {
                headers: {
                    'Accept': 'application/vnd.github.v3.raw'
                }
            });

            if (!response.ok) {
                if (response.status === 404) return null;
                throw new Error(`GitHub API error: ${response.status}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            return Buffer.from(arrayBuffer);
        } catch (error) {
            console.warn(`[GitHub] Error fetching raw file ${filePath}:`, error.message);
            return null;
        }
    }

    /**
     * Download a file from a URL to a local destination
     * @param {string} url 
     * @param {string} destPath 
     */
    async downloadFile(url, destPath) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to download file: ${response.statusText}`);

            // Ensure directory exists
            await fs.promises.mkdir(path.dirname(destPath), { recursive: true });

            const fileStream = fs.createWriteStream(destPath);
            // Native fetch body is a Web Stream, convert to Node Stream for pipeline
            await pipeline(Readable.fromWeb(response.body), fileStream);

            return destPath;
        } catch (error) {
            console.error(`[GitHub] Download error:`, error.message);
            throw error;
        }
    }
}

module.exports = GitHubService;
