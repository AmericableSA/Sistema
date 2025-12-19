const db = require('./config/db');

(async () => {
    try {
        console.log('--- Migrating Clients Table ---');
        const conn = await db.getConnection();

        try {
            // 1. Create table if not exists (with base schema or full schema)
            await conn.query(`
                CREATE TABLE IF NOT EXISTS clients (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    contract_number VARCHAR(20) UNIQUE,
                    identity_document VARCHAR(20),
                    full_name VARCHAR(150) NOT NULL,
                    phone_primary VARCHAR(20),
                    address_street VARCHAR(255),
                    city_id INT,
                    neighborhood_id INT,
                    status ENUM('active', 'suspended', 'disconnected', 'pending_install') DEFAULT 'active',
                    preferred_collector_id INT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE SET NULL,
                    FOREIGN KEY (neighborhood_id) REFERENCES neighborhoods(id) ON DELETE SET NULL,
                    FOREIGN KEY (preferred_collector_id) REFERENCES users(id) ON DELETE SET NULL
                )
            `);
            console.log('Table clients checked/created.');

            // 2. Check and Add Columns
            const [columns] = await conn.query("SHOW COLUMNS FROM clients");
            const columnNames = columns.map(c => c.Field);

            const columnsToAdd = [
                { name: 'last_payment_date', type: 'DATE' },
                { name: 'cutoff_reason', type: 'VARCHAR(255)' },
                { name: 'last_paid_month', type: 'DATE' },
                { name: 'cutoff_date', type: 'DATE' },
                { name: 'reconnection_date', type: 'DATE' }
            ];

            for (const col of columnsToAdd) {
                if (!columnNames.includes(col.name)) {
                    console.log(`Adding column ${col.name}...`);
                    await conn.query(`ALTER TABLE clients ADD COLUMN ${col.name} ${col.type}`);
                } else {
                    console.log(`Column ${col.name} already exists.`);
                }
            }

            console.log('Migration completed successfully.');

        } finally {
            conn.release();
            // We need to exit explicitly
            setTimeout(() => process.exit(0), 100);
        }

    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
})();
