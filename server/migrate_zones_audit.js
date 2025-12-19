const db = require('./config/db');

(async () => {
    try {
        console.log('--- Migrating Zones & Audit Logs ---');
        const conn = await db.getConnection();

        try {
            // 1. Create Zones Table
            await conn.query(`
                CREATE TABLE IF NOT EXISTS zones (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(100) NOT NULL UNIQUE,
                    tariff DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
                    description TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            console.log('Table zones checked/created.');

            // 2. Create Client Logs Table
            await conn.query(`
                CREATE TABLE IF NOT EXISTS client_logs (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    client_id INT NOT NULL,
                    user_id INT, -- Who made the change (can be null if system)
                    action VARCHAR(50) NOT NULL, -- UPDATE, CREATE, DELETE
                    details TEXT, -- JSON or text description of changes
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
                )
            `);
            console.log('Table client_logs checked/created.');

            // 3. Add zone_id to clients
            const [columns] = await conn.query("SHOW COLUMNS FROM clients");
            const columnNames = columns.map(c => c.Field);

            if (!columnNames.includes('zone_id')) {
                console.log('Adding column zone_id to clients...');
                await conn.query(`ALTER TABLE clients ADD COLUMN zone_id INT`);
                await conn.query(`ALTER TABLE clients ADD CONSTRAINT fk_client_zone FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE SET NULL`);
            } else {
                console.log('Column zone_id already exists.');
            }

            // Seed Default Zone
            await conn.query(`INSERT IGNORE INTO zones (id, name, tariff) VALUES (1, 'General', 300.00)`);

        } finally {
            conn.release();
            setTimeout(() => process.exit(0), 100);
        }

    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
})();
