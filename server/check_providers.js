const db = require('./config/db');

async function checkProviders() {
    try {
        const pool = await db.getConnection();
        const [tables] = await pool.query("SHOW TABLES LIKE 'providers'");
        if (tables.length > 0) {
            console.log("✅ 'providers' table FOUND.");
            const [cols] = await pool.query("SHOW COLUMNS FROM providers");
            console.log("   Columns:", cols.map(c => c.Field).join(', '));
        } else {
            console.log("❌ 'providers' table NOT FOUND.");
        }
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
checkProviders();
