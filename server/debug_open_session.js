const cashController = require('./controllers/cashController');
const db = require('./config/db');

// Mock Req/Res
const req = {
    body: {
        start_amount: 1000,
        exchange_rate: 36.6243
    }
};

const res = {
    status: (code) => ({
        json: (data) => console.log(`STATUS ${code}:`, data),
        send: (data) => console.log(`STATUS ${code} SEND:`, data)
    }),
    json: (data) => console.log("SUCCESS JSON:", data)
};

console.log("Running openSession simulation...");
cashController.openSession(req, res).then(() => {
    console.log("Simulation complete. If no error printed above, check db state.");
    process.exit(0);
}).catch(err => {
    console.error("FATAL CRASH:", err);
    process.exit(1);
});
