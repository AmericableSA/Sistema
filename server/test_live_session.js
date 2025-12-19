const http = require('http');

const data = JSON.stringify({
    start_amount: 500,
    exchange_rate: 36.6243
});

const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/billing/open',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

console.log("sending request...");
const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);

    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        console.log('BODY:', body);
    });
});

req.on('error', (e) => {
    console.error('Request Error:', e);
});

req.write(data);
req.end();
