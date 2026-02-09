
const mysql = require('mysql2/promise');
require('dotenv').config({ path: './.env' });

async function updateSchema() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST === 'localhost' || !process.env.DB_HOST ? '127.0.0.1' : process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306
    });

    try {
        const conn = await pool.getConnection();
        console.log("Connected to database...");

        // 1. Create product_units table
        console.log("Checking/Creating 'product_units' table...");
        await conn.query(`
            CREATE TABLE IF NOT EXISTS product_units (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(50) NOT NULL UNIQUE
            )
        `);

        // Seed Units
        const units = ['Unidad', 'Metro', 'Litro', 'Galón', 'Libra', 'Servicio'];
        for (const u of units) {
            await conn.query(`INSERT IGNORE INTO product_units (name) VALUES (?)`, [u]);
        }
        console.log("Units seeded.");

        // 2. Add unit_of_measure to products
        console.log("Checking 'unit_of_measure' column in products...");
        const [cols] = await conn.query("SHOW COLUMNS FROM products LIKE 'unit_of_measure'");
        if (cols.length === 0) {
            await conn.query("ALTER TABLE products ADD COLUMN unit_of_measure VARCHAR(50) DEFAULT 'Unidad'");
            console.log("Column 'unit_of_measure' added.");
        } else {
            console.log("Column 'unit_of_measure' already exists.");
        }

        // 3. Add session_type to cash_sessions (for Dual Box)
        console.log("Checking 'session_type' in cash_sessions...");
        const [sessCols] = await conn.query("SHOW COLUMNS FROM cash_sessions LIKE 'session_type'");
        if (sessCols.length === 0) {
            // we use a string or enum. Let's use VARCHAR for flexibility, default 'office'.
            await conn.query("ALTER TABLE cash_sessions ADD COLUMN session_type VARCHAR(20) DEFAULT 'OFICINA'");
            // Add index for performance
            await conn.query("CREATE INDEX idx_session_type ON cash_sessions(session_type)");
            console.log("Column 'session_type' added.");
        } else {
            console.log("Column 'session_type' already exists.");
        }

        console.log("Schema update completed successfully.");
        conn.release();
    } catch (err) {
        console.error("Schema Update Error:", err);
    } finally {
        await pool.end();
    }
}

updateSchema();
