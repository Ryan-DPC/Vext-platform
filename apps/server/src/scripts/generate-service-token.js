require('dotenv').config();
const jwt = require('jsonwebtoken');

const secret = process.env.JWT_SECRET;

if (!secret) {
    console.error('❌ Error: JWT_SECRET is not defined in environment variables.');
    process.exit(1);
}

const payload = {
    userId: 'backend-service',
    username: 'Backend Service',
    role: 'service'
};

const token = jwt.sign(payload, secret, { expiresIn: '100y' }); // Long expiration for service token

console.log('\n✅ Service Token Generated:\n');
console.log(token);
console.log('\n👉 Add this to your .env file as WS_CENTRAL_TOKEN\n');
