const db = require('./config/db');

async function migrate() {
    try {
        const pool = await db.getConnection();
        console.log("Checking schema for cash_sessions...");

        try {
            await pool.query("ALTER TABLE cash_sessions ADD COLUMN exchange_rate DECIMAL(10,4) DEFAULT 36.6243 AFTER start_amount");
            console.log("✅ Column 'exchange_rate' added.");
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log("ℹ️ Column 'exchange_rate' already exists.");
            } else {
                throw e;
            }
        }

        process.exit(0);
    } catch (err) {
        console.error("Migration Error:", err);
        process.exit(1);
    }
}

migrate();
