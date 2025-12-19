const axios = require('axios'); // User has axios installed in client but maybe not in root? server uses mysql2.
// Let's use standard http if axios missing, or try require.
// Actually server usually doesn't have axios. Use 'http'.

const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/providers',
    method: 'GET',
    headers: {
        'Content-Type': 'application/json'
    }
};

const req = http.request(options, res => {
    console.log(`STATUS: ${res.statusCode}`);
    let data = '';
    res.on('data', d => { data += d; });
    res.on('end', () => {
        console.log("RESPONSE BODY:");
        console.log(data);
    });
});

req.on('error', error => {
    console.error(error);
});

req.end();
