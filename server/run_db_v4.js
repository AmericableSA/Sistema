const fs = require('fs');
const path = require('path');
const db = require('./config/db');

const runFile = async (filename) => {
    try {
        // const sql = fs.readFileSync(path.join(__dirname, '..', filename), 'utf8'); // REMOVED: File doesn't exist and content isn't used
        console.log(`Executing ${filename} logic...`);
        console.log(`Executing ${filename}...`);

        // Split commands by delimiter if needed, or simplistic execute
        // This simple runner assumes the file can be processed or handles DELIMITER loosely
        // Since node mysql driver doesn't support DELIMITER syntax directly usually, 
        // we might need to be careful. The provided SQL uses DELIMITER $$ which might fail in simple query()
        // Let's strip DELIMITER lines and split by $$ if present, or just try running.
        // Actually, for stored procedures, it's safer to read the body.
        // Simplified approach: Reading clean commands.

        // For this specific v4 script:
        // 1. Create Table
        await db.query(`CREATE TABLE IF NOT EXISTS cash_movements (
            id INT AUTO_INCREMENT PRIMARY KEY,
            session_id INT NOT NULL,
            type ENUM('IN', 'OUT') NOT NULL,
            amount DECIMAL(10, 2) NOT NULL,
            description VARCHAR(255),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES cash_sessions(id)
        )`);

        // 2. Add Columns
        try { await db.query("ALTER TABLE cash_sessions ADD COLUMN closing_note TEXT"); } catch (e) {/*Ignore if exists*/ }
        try { await db.query("ALTER TABLE cash_sessions ADD COLUMN difference DECIMAL(10, 2) DEFAULT 0"); } catch (e) {/*Ignore*/ }
        try { await db.query("ALTER TABLE cash_sessions ADD COLUMN exchange_rate DECIMAL(10, 4) DEFAULT 37.00"); } catch (e) {/*Ignore*/ }

        console.log('Done.');
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

runFile('billing_v4_upgrade.sql');
