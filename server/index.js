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
            // 1. Status
            const [cols] = await conn.query("SHOW COLUMNS FROM transactions LIKE 'status'");
            if (cols.length === 0) {
                await conn.query("ALTER TABLE transactions ADD COLUMN status VARCHAR(20) DEFAULT 'COMPLETED'");
                log("🔄 Migration: Added 'status' to transactions");
            }
            // 2. Cancellation Reason
            const [reason] = await conn.query("SHOW COLUMNS FROM transactions LIKE 'cancellation_reason'");
            if (reason.length === 0) {
                await conn.query("ALTER TABLE transactions ADD COLUMN cancellation_reason VARCHAR(255) NULL");
                log("🔄 Migration: Added 'cancellation_reason'");
            }
            // 3. Reference ID
            const [ref] = await conn.query("SHOW COLUMNS FROM transactions LIKE 'reference_id'");
            if (ref.length === 0) {
                await conn.query("ALTER TABLE transactions ADD COLUMN reference_id VARCHAR(100) NULL");
                log("🔄 Migration: Added 'reference_id' to transactions");
            }
            // 4. Cancelled By
            const [by] = await conn.query("SHOW COLUMNS FROM transactions LIKE 'cancelled_by'");
            if (by.length === 0) {
                await conn.query("ALTER TABLE transactions ADD COLUMN cancelled_by INT NULL");
                log("🔄 Migration: Added 'cancelled_by'");
            }
            // 5. Cancelled At
            const [at] = await conn.query("SHOW COLUMNS FROM transactions LIKE 'cancelled_at'");
            if (at.length === 0) {
                await conn.query("ALTER TABLE transactions ADD COLUMN cancelled_at DATETIME NULL");
                log("🔄 Migration: Added 'cancelled_at'");
            }
            // 6. session_type in cash_sessions
            const [sessType] = await conn.query("SHOW COLUMNS FROM cash_sessions LIKE 'session_type'");
            if (sessType.length === 0) {
                await conn.query("ALTER TABLE cash_sessions ADD COLUMN session_type VARCHAR(20) DEFAULT 'OFICINA'");
                await conn.query("CREATE INDEX idx_session_type ON cash_sessions(session_type)");
                log("🔄 Migration: Added 'session_type' to cash_sessions");
            }
            // 7. session_id in transactions
            const [sessId] = await conn.query("SHOW COLUMNS FROM transactions LIKE 'session_id'");
            if (sessId.length === 0) {
                await conn.query("ALTER TABLE transactions ADD COLUMN session_id INT NULL");
                await conn.query("CREATE INDEX idx_session_id ON transactions(session_id)");
                log("🔄 Migration: Added 'session_id' to transactions");
            }
            // 8. session_id in cash_movements
            const [cmSessId] = await conn.query("SHOW COLUMNS FROM cash_movements LIKE 'session_id'");
            if (cmSessId.length === 0) {
                await conn.query("ALTER TABLE cash_movements ADD COLUMN session_id INT NULL");
                log("🔄 Migration: Added 'session_id' to cash_movements");
            }
            // 9. unit_of_measure in products
            const [prodUnit] = await conn.query("SHOW COLUMNS FROM products LIKE 'unit_of_measure'");
            if (prodUnit.length === 0) {
                await conn.query("ALTER TABLE products ADD COLUMN unit_of_measure VARCHAR(50) DEFAULT 'Unidad'");
                log("🔄 Migration: Added 'unit_of_measure' to products");
            }
            // 10. cash_sessions missing columns
            const [sysAmt] = await conn.query("SHOW COLUMNS FROM cash_sessions LIKE 'end_amount_system'");
            if (sysAmt.length === 0) {
                await conn.query("ALTER TABLE cash_sessions ADD COLUMN end_amount_system DECIMAL(10,2) NULL");
                log("🔄 Migration: Added 'end_amount_system' to cash_sessions");
            }
            const [diffCol] = await conn.query("SHOW COLUMNS FROM cash_sessions LIKE 'difference'");
            if (diffCol.length === 0) {
                await conn.query("ALTER TABLE cash_sessions ADD COLUMN difference DECIMAL(10,2) NULL");
                log("🔄 Migration: Added 'difference' to cash_sessions");
            }
            const [noteCol] = await conn.query("SHOW COLUMNS FROM cash_sessions LIKE 'closing_note'");
            if (noteCol.length === 0) {
                await conn.query("ALTER TABLE cash_sessions ADD COLUMN closing_note TEXT NULL");
                log("🔄 Migration: Added 'closing_note' to cash_sessions");
            }
            const [clsUserCol] = await conn.query("SHOW COLUMNS FROM cash_sessions LIKE 'closed_by_user_id'");
            if (clsUserCol.length === 0) {
                await conn.query("ALTER TABLE cash_sessions ADD COLUMN closed_by_user_id INT NULL");
                log("🔄 Migration: Added 'closed_by_user_id' to cash_sessions");
            }
            // 11. Service order link in products
            const [soCol] = await conn.query("SHOW COLUMNS FROM products LIKE 'creates_service_order'");
            if (soCol.length === 0) {
                await conn.query("ALTER TABLE products ADD COLUMN creates_service_order TINYINT(1) DEFAULT 0");
                log("🔄 Migration: Added 'creates_service_order' to products");
            }
            const [soTypeCol] = await conn.query("SHOW COLUMNS FROM products LIKE 'service_order_type'");
            if (soTypeCol.length === 0) {
                await conn.query("ALTER TABLE products ADD COLUMN service_order_type VARCHAR(50) DEFAULT NULL");
                log("🔄 Migration: Added 'service_order_type' to products");
            }
            // 12. Seed permanent service products (Instalación & Traslado)
            const [instExist] = await conn.query("SELECT id FROM products WHERE sku = 'SVC-INSTALACION' LIMIT 1");
            if (instExist.length === 0) {
                await conn.query(
                    `INSERT INTO products (sku, name, description, type, selling_price, unit_cost, current_stock, min_stock_alert, unit_of_measure, creates_service_order, service_order_type, is_active)
                     VALUES ('SVC-INSTALACION', 'Instalación de Servicio', 'Costo por instalación de cable y equipos en domicilio del cliente', 'service', 500.00, 0, 0, 0, 'Servicio', 1, 'INSTALLATION', 1)`
                );
                log("🌱 Seed: Inserted 'Instalación de Servicio' product");
            }
            const [trasExist] = await conn.query("SELECT id FROM products WHERE sku = 'SVC-TRASLADO' LIMIT 1");
            if (trasExist.length === 0) {
                await conn.query(
                    `INSERT INTO products (sku, name, description, type, selling_price, unit_cost, current_stock, min_stock_alert, unit_of_measure, creates_service_order, service_order_type, is_active)
                     VALUES ('SVC-TRASLADO', 'Traslado de Servicio', 'Costo por traslado o cambio de dirección del servicio instalado', 'service', 300.00, 0, 0, 0, 'Servicio', 1, 'CHANGE_ADDRESS', 1)`
                );
                log("🌱 Seed: Inserted 'Traslado de Servicio' product");
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
