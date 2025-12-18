const https = require('https');

const url = 'https://backend-ether.onrender.com/api/health';

console.log(`Checking connection to: ${url}`);

https.get(url, (res) => {
    console.log(`\nStatus Code: ${res.statusCode}`);
    console.log('Headers:', res.headers);

    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('\nResponse Body:');
        console.log(data);

        if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log('\n✅ Connection Successful!');
        } else {
            console.log('\n❌ Connection Failed (Non-200 Status)');
        }
    });

}).on('error', (err) => {
    console.error(`\n❌ Connection Error: ${err.message}`);
});
