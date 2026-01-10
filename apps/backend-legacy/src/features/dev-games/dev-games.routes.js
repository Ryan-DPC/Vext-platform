const express = require('express');
const router = express.Router();
const cloudinary = require('cloudinary').v2;

/**
 * @route GET /api/dev-games
 * @desc Get list of development games directly from Cloudinary
 */
router.get('/', async (req, res) => {
    try {
        // Search for all manifest.json files in games/dev folder
        const searchResult = await cloudinary.search
            .expression('folder:games/dev/* AND filename:manifest')
            .max_results(50)
            .execute();

        const games = [];

        // Process each found manifest
        for (const resource of searchResult.resources) {
            try {
                // Extract slug from folder path: games/dev/{slug}/manifest.json
                const folderParts = resource.folder.split('/');
                const slug = folderParts[folderParts.length - 1];

                // Fetch the manifest content
                const manifestUrl = resource.secure_url;
                const manifestResponse = await fetch(manifestUrl);

                if (manifestResponse.ok) {
                    const manifest = await manifestResponse.json();

                    // Add Cloudinary URLs
                    manifest.manifestUrl = manifestUrl;
                    manifest.zipUrl = cloudinary.url(`games/dev/${slug}/${slug}.zip`, {
                        resource_type: 'raw'
                    });
                    manifest.imageUrl = cloudinary.url(`games/dev/${slug}/image`, {
                        resource_type: 'image',
                        format: 'png'
                    });
                    manifest.defaultImageUrl = cloudinary.url('games/default-game', {
                        resource_type: 'image',
                        format: 'png'
                    });

                    // Ensure slug is set
                    manifest.slug = slug;

                    games.push(manifest);
                }
            } catch (err) {
                console.error(`Error processing game manifest: ${err.message}`);
            }
        }

        res.json({
            success: true,
            count: games.length,
            games
        });
    } catch (error) {
        console.error('Error fetching dev games from Cloudinary:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route GET /api/dev-games/:gameId
 * @desc Get a specific dev game's manifest
 */
router.get('/:gameId', async (req, res) => {
    try {
        const { gameId } = req.params;

        // Construct manifest URL directly
        const manifestUrl = cloudinary.url(`games/dev/${gameId}/manifest.json`, {
            resource_type: 'raw'
        });

        const manifestResponse = await fetch(manifestUrl);

        if (!manifestResponse.ok) {
            return res.status(404).json({
                success: false,
                error: 'Game not found'
            });
        }

        const manifest = await manifestResponse.json();

        // Add URLs
        manifest.manifestUrl = manifestUrl;
        manifest.zipUrl = cloudinary.url(`games/dev/${gameId}/${gameId}.zip`, {
            resource_type: 'raw'
        });
        manifest.imageUrl = cloudinary.url(`games/dev/${gameId}/image`, {
            resource_type: 'image',
            format: 'png'
        });
        manifest.defaultImageUrl = cloudinary.url('games/default-game', {
            resource_type: 'image',
            format: 'png'
        });

        // Ensure slug is set
        manifest.slug = gameId;

        res.json({
            success: true,
            game: manifest
        });
    } catch (error) {
        console.error('Error fetching dev game:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
