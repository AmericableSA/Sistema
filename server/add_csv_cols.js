const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

async function addCols() {
    try {
        console.log("Adding columns...");
        // Add city
        try { await pool.query("ALTER TABLE clients ADD COLUMN city VARCHAR(100) DEFAULT 'Managua'"); console.log("Added city"); } catch (e) { }
        // Add last_payment_date
        try { await pool.query("ALTER TABLE clients ADD COLUMN last_payment_date DATE"); console.log("Added last_payment_date"); } catch (e) { }
        // Add cutoff_date
        try { await pool.query("ALTER TABLE clients ADD COLUMN cutoff_date DATE"); console.log("Added cutoff_date"); } catch (e) { }
        // Add reconnection_date
        try { await pool.query("ALTER TABLE clients ADD COLUMN reconnection_date DATE"); console.log("Added reconnection_date"); } catch (e) { }
        // Add disconnection_reason (if cutoff_reason exists, we might use that, but let's Ensure)
        try { await pool.query("ALTER TABLE clients ADD COLUMN disconnection_reason VARCHAR(255)"); console.log("Added disconnection_reason"); } catch (e) { }

    } catch (e) {
        console.error("error", e.message);
    } finally {
        pool.end();
    }
}

addCols();
