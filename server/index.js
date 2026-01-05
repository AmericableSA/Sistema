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
    .then(async conn => {
        log("✅ Database Connected Successfully (IPv4)");

        // --- AUTO MIGRATION FOR CANCELLATION ---
        try {
            const [cols] = await conn.query("SHOW COLUMNS FROM transactions LIKE 'status'");
            if (cols.length === 0) {
                await conn.query("ALTER TABLE transactions ADD COLUMN status VARCHAR(20) DEFAULT 'COMPLETED'");
                log("🔄 Migration: Added 'status' to transactions");
            }
            const [reason] = await conn.query("SHOW COLUMNS FROM transactions LIKE 'cancellation_reason'");
            if (reason.length === 0) {
                await conn.query("ALTER TABLE transactions ADD COLUMN cancellation_reason VARCHAR(255) NULL");
                log("🔄 Migration: Added 'cancellation_reason'");
            }
            const [by] = await conn.query("SHOW COLUMNS FROM transactions LIKE 'cancelled_by'");
            if (by.length === 0) {
                await conn.query("ALTER TABLE transactions ADD COLUMN cancelled_by INT NULL");
                log("🔄 Migration: Added 'cancelled_by'");
            }
            const [at] = await conn.query("SHOW COLUMNS FROM transactions LIKE 'cancelled_at'");
            if (at.length === 0) {
                await conn.query("ALTER TABLE transactions ADD COLUMN cancelled_at DATETIME NULL");
                log("🔄 Migration: Added 'cancelled_at'");
            }
        } catch (migErr) {
            log("⚠️ Migration Error: " + migErr.message);
        }
        // ---------------------------------------

        conn.release();
    })
    .catch(err => {
        log("❌ Database Connection Failed: " + err.message);
    });

app.listen(PORT, '0.0.0.0', () => {
    log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});
