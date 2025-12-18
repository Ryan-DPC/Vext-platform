require('dotenv').config();
const mongoose = require('mongoose');
const { cloudinary } = require('../config/cloudinary');
const Game = require('../features/games/games.model');
const path = require('path');

const ZIP_PATH = path.join(__dirname, '../../../../Eterium/games/EtherChess/etherchess.zip');
const GAME_SLUG = 'ether-chess';

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGO_URL);
        console.log('MongoDB Connected');
    } catch (err) {
        console.error('MongoDB Connection Error:', err);
        process.exit(1);
    }
};

const uploadGame = async () => {
    console.log(`Uploading ${ZIP_PATH} to Cloudinary...`);
    try {
        const result = await cloudinary.uploader.upload(ZIP_PATH, {
            resource_type: 'raw',
            folder: 'ether/games',
            public_id: `ether-chess-${Date.now()}`,
            use_filename: true,
            unique_filename: false
        });
        console.log('Upload successful:', result.secure_url);
        return result.secure_url;
    } catch (error) {
        console.error('Cloudinary Upload Error:', error);
        process.exit(1);
    }
};

const registerGame = async (downloadUrl) => {
    console.log('Registering game in database...');
    try {
        let game = await Game.getGameByName(GAME_SLUG);

        const gameData = {
            game_name: 'Ether Chess',
            folder_name: GAME_SLUG,
            description: 'A modern, minimalist Chess game with AI and Multiplayer.',
            price: 0,
            developer: 'Ether Team',
            status: 'disponible',
            zipUrl: downloadUrl,
            manifestVersion: '1.0.0',
            is_multiplayer: true,
            image_url: 'https://placehold.co/600x400/1b1f23/ffffff?text=Ether+Chess'
        };

        if (game) {
            console.log('Updating existing game record...');
            const GameModel = mongoose.model('Game');
            game = await GameModel.findOneAndUpdate({ folder_name: GAME_SLUG }, gameData, { new: true });
        } else {
            console.log('Creating new game record...');
            await Game.addGame(gameData);
            game = await Game.getGameByName(GAME_SLUG);
        }

        console.log('Game registered successfully:', game.game_name);
        console.log('ID:', game.id || game._id);
    } catch (error) {
        console.error('Database Error:', error);
        process.exit(1);
    }
};

const run = async () => {
    await connectDB();
    // Cloudinary limit reached, using local hosting
    // const url = await uploadGame();
    const url = 'http://localhost:3001/public/games/etherchess.zip';
    await registerGame(url);
    console.log('Deployment complete!');
    process.exit(0);
};

run();
