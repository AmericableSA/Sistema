const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

(async () => {
    try {
        const conn = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log("--- COLUMNAS DE LA TABLA TRANSACTIONS ---");
        const [rows] = await conn.query("SHOW COLUMNS FROM transactions");
        rows.forEach(r => {
            if (r.Field === 'reference_id' || r.Field === 'status' || r.Field === 'cancellation_reason') {
                console.log(`✅ ${r.Field} (${r.Type})`);
            } else {
                console.log(`- ${r.Field}`);
            }
        });
        conn.end();
    } catch (e) { console.error(e); }
})();
