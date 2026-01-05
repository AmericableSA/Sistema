const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, 'server/.env') });

(async () => {
    try {
        const conn = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });
        console.log("Connected! Checking columns for 'transactions'...");
        const [rows] = await conn.query("SHOW COLUMNS FROM transactions");
        console.log(rows.map(r => r.Field));
        await conn.end();
    } catch (e) {
        console.error("Error:", e.message);
    }
})();
