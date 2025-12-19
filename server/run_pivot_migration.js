const db = require('./config/db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    try {
        const pool = await db.getConnection();
        const sql = fs.readFileSync(path.join(__dirname, 'database', 'pivot_invoices_to_expenses.sql'), 'utf8');
        const commands = sql.split(';').filter(cmd => cmd.trim());

        console.log("🔄 Running Pivot Migration...");

        for (const cmd of commands) {
            if (cmd.trim()) {
                await pool.query(cmd);
                console.log("   ✅ Executed SQL command.");
            }
        }

        console.log("✅ Pivot Migration Complete.");
        pool.release();
        process.exit(0);

    } catch (err) {
        console.error("❌ Migration Failed:", err);
        process.exit(1);
    }
}

runMigration();
