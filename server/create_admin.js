const db = require('./config/db');

async function createAdmin() {
    try {
        const pool = await db.getConnection();
        const username = 'waskar';
        const passwordPlain = '1987';
        const role = 'admin';
        const fullName = 'Admin Waskar';
        const identityDoc = 'ADMIN-001';

        // Check columns to be safe
        try { await pool.query("ALTER TABLE users ADD COLUMN password VARCHAR(255) DEFAULT '123456'"); } catch (e) { }
        try { await pool.query("ALTER TABLE users ADD COLUMN role ENUM('admin', 'cajero', 'tecnico') DEFAULT 'cajero'"); } catch (e) { }

        const [existing] = await pool.query("SELECT * FROM users WHERE username = ?", [username]);

        if (existing.length > 0) {
            console.log("Updating 'waskar'...");
            await pool.query(
                "UPDATE users SET password = ?, password_hash = ?, role = ? WHERE username = ?",
                [passwordPlain, passwordPlain, role, username]
            );
        } else {
            console.log("Creating 'waskar'...");
            // Providing password_hash AND password to satisfy all constraints
            await pool.query(
                "INSERT INTO users (username, password, password_hash, full_name, role, identity_document) VALUES (?, ?, ?, ?, ?, ?)",
                [username, passwordPlain, passwordPlain, fullName, role, identityDoc]
            );
        }

        console.log("✅ Admin user 'waskar' created/updated with password '1987'.");
        pool.release();
        process.exit();
    } catch (err) {
        console.error("❌ Error:", err);
        process.exit(1);
    }
}

createAdmin();
