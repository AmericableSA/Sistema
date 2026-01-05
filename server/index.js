const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

function log(msg) {
    process.stdout.write(msg + '\n');
}

const db = require('./config/db');
const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas de la API (Prioridad)
app.use('/api/products', require('./routes/products'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/users', require('./routes/users'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/zones', require('./routes/zones'));
app.use('/api/cities', require('./routes/cities'));
app.use('/api/billing', require('./routes/billing'));
app.use('/api/providers', require('./routes/providers'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/history', require('./routes/history'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/notifications', require('./routes/webNotifications'));

// Archivos Estáticos
app.use(express.static(path.join(__dirname, '../client/dist')));

// SOLUCIÓN AL PathError: Captura todo sin usar caracteres conflictivos
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist', 'index.html'));
});

// Test DB Connection
db.getConnection()
    .then(conn => {
        log("✅ Database Connected Successfully (IPv4)");
        conn.release();
    })
    .catch(err => {
        log("❌ Database Connection Failed: " + err.message);
    });

app.listen(PORT, '0.0.0.0', () => {
    log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});
