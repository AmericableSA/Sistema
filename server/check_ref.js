const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mysql = require('mysql2/promise');

(async () => {
    console.log("Attempting check...");
    try {
        const conn = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });
        console.log("Connected to DB.");

        try {
            await conn.query("ALTER TABLE transactions ADD COLUMN reference_id VARCHAR(100) NULL");
            console.log("SUCCESS: reference_id column WAS MISSING and has been ADDED.");
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log("INFO: reference_id column ALREADY EXISTS.");
            } else {
                console.error("ALTER ERROR:", e.message);
            }
        }
        conn.end();
    } catch (e) {
        console.error("CONNECTION ERROR:", e.message);
    }
})();
