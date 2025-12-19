const db = require('./config/db');

async function migrate() {
    try {
        const pool = await db.getConnection();
        console.log("Checking for issue_date column...");

        try {
            await pool.query("ALTER TABLE invoices ADD COLUMN issue_date DATE AFTER reference_number");
            console.log("✅ Column 'issue_date' added.");
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log("ℹ️ Column 'issue_date' already exists.");
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
