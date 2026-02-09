
const mysql = require('mysql2/promise');
require('dotenv').config({ path: './.env' });

async function checkSchema() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST === 'localhost' ? '127.0.0.1' : process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306
    });

    try {
        console.log("Checking 'product_units' table...");
        const [tables] = await pool.query("SHOW TABLES LIKE 'product_units'");
        console.log("Table 'product_units' exists:", tables.length > 0);

        console.log("Checking 'unit_of_measure' column in 'products'...");
        const [cols] = await pool.query("SHOW COLUMNS FROM products LIKE 'unit_of_measure'");
        console.log("Column 'unit_of_measure' exists:", cols.length > 0);

    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        await pool.end();
    }
}

checkSchema();
