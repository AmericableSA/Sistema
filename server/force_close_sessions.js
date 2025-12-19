const db = require('./config/db');

async function fix() {
    try {
        const pool = await db.getConnection();
        console.log("Cleaning stuck sessions...");
        await pool.query("UPDATE cash_sessions SET status = 'closed', end_time = NOW() WHERE status = 'open'");
        console.log("✅ All open sessions force-closed.");
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
fix();
