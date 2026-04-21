const pool = require('../server/config/db');

async function check() {
    try {
        const [rows] = await pool.query('SELECT id, client_id, amount, details_json, status, created_at FROM transactions ORDER BY id DESC LIMIT 5');
        console.log(JSON.stringify(rows, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
