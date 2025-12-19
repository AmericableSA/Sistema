const db = require('./config/db');

async function check() {
    try {
        const pool = await db.getConnection();

        console.log("--- PROVIDERS COLUMNS ---");
        const [pCols] = await pool.query("DESCRIBE providers");
        console.log(JSON.stringify(pCols.map(c => c.Field)));

        console.log("--- CLIENTS COLUMNS ---");
        const [cCols] = await pool.query("DESCRIBE clients");
        console.log(JSON.stringify(cCols.map(c => c.Field)));

        console.log("--- CLIENT STATUSES ---");
        const [statuses] = await pool.query("SELECT status, COUNT(*) as count FROM clients GROUP BY status");
        console.log(JSON.stringify(statuses));

        process.exit();
    } catch (e) { console.error(e); process.exit(1); }
}
check();
