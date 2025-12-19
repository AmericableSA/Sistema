const db = require('./config/db');

async function migrate() {
    try {
        const pool = await db.getConnection();
        console.log("🔌 Connected to DB. Checking Tables...");

        // 1. PROVIDERS
        console.log("🔨 Checking 'providers' table...");
        await pool.query(`
            CREATE TABLE IF NOT EXISTS providers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                contact_name VARCHAR(255),
                phone VARCHAR(50),
                email VARCHAR(100),
                address TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("✅ 'providers' table ready.");

        // 2. INVOICES
        console.log("🔨 Checking 'invoices' table...");
        await pool.query(`
            CREATE TABLE IF NOT EXISTS invoices (
                id INT AUTO_INCREMENT PRIMARY KEY,
                provider_id INT NOT NULL,
                reference_number VARCHAR(100), 
                amount DECIMAL(10,2) NOT NULL,
                balance DECIMAL(10,2) NOT NULL,
                description TEXT,
                due_date DATE,
                status VARCHAR(20) DEFAULT 'PENDIENTE',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE
            )
        `);
        console.log("✅ 'invoices' table ready.");

        // 3. SEED DEFAULT PROVIDER (If empty)
        const [rows] = await pool.query("SELECT COUNT(*) as c FROM providers");
        if (rows[0].c === 0) {
            console.log("🌱 Seeding default provider...");
            await pool.query(`
                INSERT INTO providers (name, contact_name, phone, email, address) 
                VALUES ('Proveedor General', 'Administracion', '2222-2222', 'admin@americable.com', 'Oficina Central')
            `);
            console.log("✅ Default provider created.");
        }

        console.log("🚀 MIGRATION SUCCESSFUL");
        pool.release();
        process.exit(0);

    } catch (err) {
        console.error("❌ Migration Failed:", err);
        process.exit(1);
    }
}

migrate();
