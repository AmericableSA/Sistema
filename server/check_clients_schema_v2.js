const db = require('./config/db');

async function checkClientsSchema() {
    try {
        const pool = await db.getConnection();
        const [columns] = await pool.query(`SHOW COLUMNS FROM clients`);
        console.log("Columns:", columns.map(c => c.Field).join(', '));
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
checkClientsSchema();
