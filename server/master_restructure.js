const db = require('./config/db');

async function masterRestructure() {
    console.log("🚀 STARTING MASTER DB RESTRUCTURE...");
    const pool = await db.getConnection();

    const addColumn = async (table, colDef) => {
        try {
            await pool.query(`ALTER TABLE ${table} ADD COLUMN ${colDef}`);
            console.log(`   ✅ Added column to ${table}: ${colDef.split(' ')[0]}`);
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                // console.log(`   ℹ️ Column already exists in ${table}: ${colDef.split(' ')[0]}`);
            } else {
                console.error(`   ❌ Error adding to ${table}:`, e.message);
            }
        }
    };

    try {
        // 1. USERS
        console.log("🔨 Processing 'users'...");
        await pool.query(`CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            role VARCHAR(20) DEFAULT 'cashier',
            full_name VARCHAR(100),
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
        // Ensure Admin Exists
        await pool.query(`INSERT IGNORE INTO users (username, password, role, full_name) VALUES ('admin', '$2a$10$X...', 'admin', 'Administrador')`);

        // 2. CLIENTS
        console.log("🔨 Processing 'clients'...");
        await pool.query(`CREATE TABLE IF NOT EXISTS clients (
            id INT AUTO_INCREMENT PRIMARY KEY,
            contract_number VARCHAR(50),
            full_name VARCHAR(100) NOT NULL,
            phone_primary VARCHAR(20),
            address_street TEXT,
            status VARCHAR(20) DEFAULT 'active',
            balance DECIMAL(10,2) DEFAULT 0.00,
            last_paid_month DATE,
            installation_date DATE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
        await addColumn('clients', 'installation_date DATE');
        await addColumn('clients', 'email VARCHAR(100)');
        await addColumn('clients', 'city VARCHAR(50) DEFAULT "Managua"');

        // 3. PROVIDERS
        console.log("🔨 Processing 'providers'...");
        await pool.query(`CREATE TABLE IF NOT EXISTS providers (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            contact_name VARCHAR(100),
            phone VARCHAR(50),
            email VARCHAR(100),
            address TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        // 4. INVOICES (Cuentas por Pagar)
        console.log("🔨 Processing 'invoices'...");
        await pool.query(`CREATE TABLE IF NOT EXISTS invoices (
            id INT AUTO_INCREMENT PRIMARY KEY,
            provider_id INT NOT NULL,
            reference_number VARCHAR(50),
            amount DECIMAL(10,2) NOT NULL,
            balance DECIMAL(10,2) NOT NULL,
            description TEXT,
            issue_date DATE,
            due_date DATE,
            status VARCHAR(20) DEFAULT 'PENDIENTE',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE
        )`);
        await addColumn('invoices', 'issue_date DATE');

        // 5. CASH SESSIONS
        console.log("🔨 Processing 'cash_sessions'...");
        await pool.query(`CREATE TABLE IF NOT EXISTS cash_sessions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            start_amount DECIMAL(10,2) DEFAULT 0,
            end_amount_system DECIMAL(10,2),
            end_amount_physical DECIMAL(10,2),
            difference DECIMAL(10,2),
            status VARCHAR(20) DEFAULT 'open',
            start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            end_time TIMESTAMP NULL,
            exchange_rate DECIMAL(10,4) DEFAULT 36.6243,
            closing_note TEXT
        )`);
        await addColumn('cash_sessions', 'exchange_rate DECIMAL(10,4) DEFAULT 36.6243');

        // 6. TRANSACTIONS
        console.log("🔨 Processing 'transactions'...");
        await pool.query(`CREATE TABLE IF NOT EXISTS transactions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            session_id INT NOT NULL,
            client_id INT,
            invoice_id INT,
            amount DECIMAL(10,2) NOT NULL,
            type VARCHAR(10) NOT NULL, -- IN, OUT
            payment_method VARCHAR(20),
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            notes TEXT,
            collector_id INT
        )`);
        await addColumn('transactions', 'invoice_id INT');
        await addColumn('transactions', 'collector_id INT');

        // 7. PRODUCTS (Inventory)
        console.log("🔨 Processing 'products'...");
        await pool.query(`CREATE TABLE IF NOT EXISTS products (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            price DECIMAL(10,2) NOT NULL,
            stock INT DEFAULT 0,
            category VARCHAR(50),
            is_active BOOLEAN DEFAULT TRUE
        )`);

        console.log("✅ MASTER RESTRUCTURE COMPLETE. ALL SYSTEMS GO.");

    } catch (err) {
        console.error("❌ CRITICAL FAILURE:", err);
    } finally {
        pool.release();
        process.exit(0);
    }
}

masterRestructure();
