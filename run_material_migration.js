const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'server', '.env') });
const db = require('./server/config/db');
const fs = require('fs');

async function runMigration() {
    try {
        console.log('Running migration...');

        // 1. Add unit_of_measure
        // Simple try/catch approach for the column
        try {
            await db.query("ALTER TABLE products ADD COLUMN unit_of_measure VARCHAR(50) DEFAULT 'Unidad'");
            console.log("Added unit_of_measure column.");
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log("Column unit_of_measure already exists.");
            } else {
                console.error("Error adding column:", e);
            }
        }

        // 2. Create table
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS service_order_materials (
                id INT AUTO_INCREMENT PRIMARY KEY,
                service_order_id INT NOT NULL,
                product_id INT NOT NULL,
                quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
            )
        `;

        await db.query(createTableSQL);
        console.log("Table service_order_materials checked/created.");

        console.log("Migration complete.");
        process.exit(0);
    } catch (err) {
        console.error("Fatal Error during migration:", err);
        process.exit(1);
    }
}

runMigration();
