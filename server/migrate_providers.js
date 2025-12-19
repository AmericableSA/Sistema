const db = require('./config/db');

async function migrate() {
    try {
        const pool = await db.getConnection();

        // Check if email column exists
        const [cols] = await pool.query("DESCRIBE providers");
        const fields = cols.map(c => c.Field);

        if (!fields.includes('email')) {
            console.log("Adding email column...");
            await pool.query("ALTER TABLE providers ADD COLUMN email VARCHAR(255)");
        }
        if (!fields.includes('address')) {
            console.log("Adding address column...");
            await pool.query("ALTER TABLE providers ADD COLUMN address TEXT");
        }

        console.log("Migration complete.");
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
migrate();
