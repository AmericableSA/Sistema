const db = require('./config/db');

async function checkClientsSchema() {
    try {
        const pool = await db.getConnection();
        const [columns] = await pool.query(`DESCRIBE clients`);
        console.log(columns.map(c => c.Field));
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
checkClientsSchema();
