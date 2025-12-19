const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

async function dumpSchema() {
    try {
        const [rows] = await pool.query("SHOW CREATE TABLE clients");
        console.log(rows[0]['Create Table']);
    } catch (e) {
        console.error("❌ Error:", e.message);
    } finally {
        pool.end();
    }
}

dumpSchema();
