
const db = require('./config/db');

(async () => {
    try {
        const pool = await db.getConnection();
        console.log("Checking tables...");

        // 1. PROVIDERS
        await pool.query(`
            CREATE TABLE IF NOT EXISTS providers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nombre VARCHAR(255) NOT NULL,
                contacto VARCHAR(255),
                telefono VARCHAR(50),
                email VARCHAR(255),
                direccion TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("✅ Providers table verified.");

        // 2. PRODUCTS (If missing, for inventory report)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS products (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nombre VARCHAR(255) NOT NULL,
                descripcion TEXT,
                precio DECIMAL(10,2) DEFAULT 0.00,
                stock INT DEFAULT 0,
                costo DECIMAL(10,2) DEFAULT 0.00,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("✅ Products table verified.");

        // 3. INVOICES (Expenses)
        // Ensure it has provider_id, etc.
        await pool.query(`
            CREATE TABLE IF NOT EXISTS invoices (
                id INT AUTO_INCREMENT PRIMARY KEY,
                provider_id INT,
                reference_number VARCHAR(100),
                amount DECIMAL(10,2) NOT NULL,
                balance DECIMAL(10,2) NOT NULL,
                issue_date DATE,
                due_date DATE,
                description TEXT,
                status ENUM('PENDING', 'PAID', 'PARTIAL', 'CANCELLED') DEFAULT 'PENDING',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE SET NULL
            )
        `);
        console.log("✅ Invoices (Expenses) table verified.");

        pool.release();
        process.exit(0);
    } catch (err) {
        console.error("❌ Error ensuring tables:", err);
        process.exit(1);
    }
})();
