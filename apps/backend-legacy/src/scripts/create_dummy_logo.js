const fs = require('fs');
const path = require('path');

const PUBLIC_GAMES_DIR = path.resolve(__dirname, '../../public/games');
const LOGO_PATH = path.join(PUBLIC_GAMES_DIR, 'etherchess.png');

// Ensure directory exists
if (!fs.existsSync(PUBLIC_GAMES_DIR)) {
    fs.mkdirSync(PUBLIC_GAMES_DIR, { recursive: true });
}

// Create a simple 64x64 purple placeholder image (valid PNG)
// This is a 1x1 pixel scaled up, effectively.
const pngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN88/7jfwAJWAPt02uQ3AAAAABJRU5ErkJggg==', 'base64');

fs.writeFileSync(LOGO_PATH, pngBuffer);
console.log(`✅ Created dummy logo at ${LOGO_PATH}`);
