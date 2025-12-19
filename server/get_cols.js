const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

async function listCols() {
    try {
        const [rows] = await pool.query("SHOW COLUMNS FROM clients");
        console.log(JSON.stringify(rows.map(r => r.Field)));
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

listCols();
