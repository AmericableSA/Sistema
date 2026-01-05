const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const db = require('./config/db');

async function runMigration() {
    try {
        const pool = await db.getConnection();
        console.log('Connected to DB. Running Migration...');

        // Check columns to avoid errors
        const [cols] = await pool.query("SHOW COLUMNS FROM transactions LIKE 'status'");
        if (cols.length > 0) {
            console.log("Column 'status' already exists. Skipping.");
        } else {
            await pool.query("ALTER TABLE transactions ADD COLUMN status VARCHAR(20) DEFAULT 'COMPLETED'");
            console.log("Added 'status'");
        }

        const [reason] = await pool.query("SHOW COLUMNS FROM transactions LIKE 'cancellation_reason'");
        if (reason.length === 0) {
            await pool.query("ALTER TABLE transactions ADD COLUMN cancellation_reason VARCHAR(255) NULL");
            console.log("Added 'cancellation_reason'");
        }

        const [by] = await pool.query("SHOW COLUMNS FROM transactions LIKE 'cancelled_by'");
        if (by.length === 0) {
            await pool.query("ALTER TABLE transactions ADD COLUMN cancelled_by INT NULL");
            console.log("Added 'cancelled_by'");
        }

        const [at] = await pool.query("SHOW COLUMNS FROM transactions LIKE 'cancelled_at'");
        if (at.length === 0) {
            await pool.query("ALTER TABLE transactions ADD COLUMN cancelled_at DATETIME NULL");
            console.log("Added 'cancelled_at'");
        }

        console.log("Migration Complete.");
        pool.release();
        process.exit();

    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

runMigration();
