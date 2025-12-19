const db = require('./config/db');

async function scan() {
    try {
        const pool = await db.getConnection();
        const [tables] = await pool.query("SHOW TABLES");
        const tableNames = tables.map(t => Object.values(t)[0]);

        console.log("FOUND TABLES:", tableNames);

        for (const t of tableNames) {
            const [cols] = await pool.query(`DESCRIBE ${t}`);
            console.log(`\nTABLE: ${t}`);
            cols.forEach(c => console.log(` - ${c.Field} (${c.Type})`));
        }

        pool.release();
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
scan();
