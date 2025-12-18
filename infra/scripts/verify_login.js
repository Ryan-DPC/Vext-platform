const axios = require('axios');

const API_URL = 'https://backend-ether.onrender.com/api/auth/login';

async function testLogin() {
    try {
        console.log(`Attempting login to ${API_URL}...`);
        const response = await axios.post(API_URL, {
            username: 'ChinOLaoy#EFI', // Trying with tag as per DB
            password: 'Testtest'
        });
        console.log('✅ Login Successful!');
        console.log('Status:', response.status);
        console.log('Token:', response.data.token ? 'Yes' : 'No');
        console.log('User:', response.data.user.username);
    } catch (error) {
        if (error.response) {
            console.error('❌ Login Failed:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error('❌ Network/Other Error:', error.message);
        }
    }

    // Also try without tag just in case
    try {
        console.log(`\nAttempting login (no tag) to ${API_URL}...`);
        const response = await axios.post(API_URL, {
            username: 'ChinOLaoy',
            password: 'Testtest'
        });
        console.log('✅ Login Successful (No Tag)!');
    } catch (error) {
        if (error.response) {
            console.error('❌ Login Failed (No Tag):', error.response.status);
        }
    }
}

testLogin();
