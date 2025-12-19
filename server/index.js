const express = require('express');
const cors = require('cors');

function log(msg) {
    process.stdout.write(msg + '\n');
}

log("Loading DB config...");
const db = require('./config/db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
log("Init Middleware...");
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
log("Loading routes/products...");
app.use('/api/products', require('./routes/products'));

log("Loading routes/transactions...");
app.use('/api/transactions', require('./routes/transactions'));

log("Loading routes/users...");
app.use('/api/users', require('./routes/users'));

log("Loading uploadController...");
app.post('/api/upload/clients', require('./controllers/uploadController').uploadClients);

log("Loading routes/clients...");
app.use('/api/clients', require('./routes/clients'));

log("Loading routes/zones...");
app.use('/api/zones', require('./routes/zones'));

log("Loading routes/cities...");
app.use('/api/cities', require('./routes/cities'));

log("Loading routes/billing...");
app.use('/api/billing', require('./routes/billing'));

log("Loading routes/providers...");
app.use('/api/providers', require('./routes/providers'));

log("Loading routes/settings...");
app.use('/api/settings', require('./routes/settings'));

log("Loading routes/history...");
app.use('/api/history', require('./routes/history'));

log("Loading routes/reports...");
app.use('/api/reports', require('./routes/reports'));

log("Loading routes/auth...");
app.use('/api/auth', require('./routes/auth'));

log("Loading routes/invoices...");
app.use('/api/invoices', require('./routes/invoices'));

// Test DB Connection
db.getConnection()
    .then(conn => {
        log("✅ Database Connected Successfully");
        conn.release();
    })
    .catch(err => {
        console.error("❌ Database Connection Failed:", err);
    });

// Basic Route
// app.get('/', (req, res) => {
//     res.send('Ameri-Cable Inventory API is Running');
// });

// STATIC FILES (PRODUCTION)
const path = require('path');
app.use(express.static(path.join(__dirname, '../client/dist')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
    log(`🚀 Server running on http://localhost:${PORT}`);
});
