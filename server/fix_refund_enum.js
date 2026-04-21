const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const db = require('./config/db');

async function fixRefundEnum() {
    try {
        const tunnel = await db.getConnection();
        console.log('Validando esquema de cash_movements...');

        // Check if cash_movements exists
        const [tables] = await tunnel.query("SHOW TABLES LIKE 'cash_movements'");
        if (tables.length === 0) {
            console.log("Error: Tabla cash_movements no encontrada.");
            process.exit(1);
        }

        // Add REFUND to the type enum (or convert column back to string/varchar for flexibility)
        // Most robust: use VARCHAR(20) to avoid enum lock-ins
        await tunnel.query("ALTER TABLE cash_movements MODIFY COLUMN type VARCHAR(20)");
        console.log("Columna 'type' de cash_movements convertida a VARCHAR(20) para soportar REFUND.");

        // Also ensure transactions has the cancelled_at column if not there
        const [txCols] = await tunnel.query("SHOW COLUMNS FROM transactions LIKE 'cancelled_at'");
        if (txCols.length === 0) {
           await tunnel.query("ALTER TABLE transactions ADD COLUMN cancelled_at DATETIME NULL");
           console.log("Añadida columna 'cancelled_at' a transactions.");
        }

        tunnel.release();
        console.log('Migración completada con éxito.');
        process.exit(0);
    } catch (err) {
        console.error('Error en migración:', err);
        process.exit(1);
    }
}

fixRefundEnum();
