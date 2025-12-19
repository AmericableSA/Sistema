const db = require('./server/config/db');

async function check() {
    try {
        const pool = await db.getConnection();
        console.log("Checking Clients Data...");

        // 1. Check Statuses
        const [statuses] = await pool.query("SELECT status, COUNT(*) as c FROM clients GROUP BY status");
        console.table(statuses);

        // 2. Check Sample Dates
        const [dates] = await pool.query("SELECT id, status, last_paid_month, zone_id FROM clients LIMIT 5");
        console.table(dates);

        // 3. Check Zones
        const [zones] = await pool.query("SELECT * FROM zones LIMIT 5");
        console.table(zones);

        pool.release();
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
