const db = require('./config/db');
const fs = require('fs');

async function check() {
    try {
        const pool = await db.getConnection();
        const data = {};

        // Providers
        const [pCols] = await pool.query("DESCRIBE providers");
        data.providers = pCols.map(c => c.Field);

        // Clients
        const [cCols] = await pool.query("DESCRIBE clients");
        data.clients = cCols.map(c => c.Field);

        // Client Statuses
        const [statuses] = await pool.query("SELECT status, COUNT(*) as count FROM clients GROUP BY status");
        data.client_statuses = statuses;

        fs.writeFileSync('schema_dump.json', JSON.stringify(data, null, 2));
        console.log("Dumped to schema_dump.json");
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
