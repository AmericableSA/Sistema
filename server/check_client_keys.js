const db = require('./config/db');

async function checkRow() {
    try {
        const pool = await db.getConnection();
        const [rows] = await pool.query(`SELECT * FROM clients LIMIT 1`);
        if (rows.length > 0) {
            console.log("Keys:", Object.keys(rows[0]).join(', '));
        } else {
            console.log("No clients found, can't check keys.");
            const [columns] = await pool.query(`SHOW COLUMNS FROM clients`);
            console.log("Columns from SHOW:", columns.map(c => c.Field));
        }
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
checkRow();
