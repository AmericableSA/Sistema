require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
    try {
        const pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log("Modifying phone_primary column...");
        await pool.query("ALTER TABLE clients MODIFY COLUMN phone_primary VARCHAR(100)");
        console.log("Column resized successfully.");
        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
})();
