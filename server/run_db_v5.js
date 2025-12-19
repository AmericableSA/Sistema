const fs = require('fs');
const path = require('path');
const db = require('./config/db');

const runFile = async (filename) => {
    try {
        console.log(`Executing ${filename}...`);

        // 1. Settings Table
        await db.query(`CREATE TABLE IF NOT EXISTS system_settings (
            setting_key VARCHAR(50) PRIMARY KEY,
            setting_value VARCHAR(255) NOT NULL,
            description VARCHAR(255)
        )`);

        await db.query(`INSERT IGNORE INTO system_settings (setting_key, setting_value, description) VALUES 
            ('mora_fee', '50.00', 'Cargo por Mora (C$)'), 
            ('exchange_rate', '36.6243', 'Tasa de Cambio Oficial'),
            ('cutoff_day', '15', 'Día del mes para corte automático')`);

        // 2. Client Columns
        try { await db.query("ALTER TABLE clients ADD COLUMN due_months INT DEFAULT 0"); } catch (e) { }
        try { await db.query("ALTER TABLE clients ADD COLUMN has_mora BOOLEAN DEFAULT FALSE"); } catch (e) { }
        try { await db.query("ALTER TABLE clients ADD COLUMN mora_balance DECIMAL(10, 2) DEFAULT 0.00"); } catch (e) { }
        try { await db.query("ALTER TABLE transactions ADD COLUMN details_json JSON"); } catch (e) { }

        console.log('Done.');
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

runFile('billing_v5_upgrade.sql');
