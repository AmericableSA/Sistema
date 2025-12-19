const db = require('./config/db');

async function updateSchema() {
    try {
        const pool = await db.getConnection();
        console.log("Checking for 'role' column...");

        try {
            await pool.query("ALTER TABLE users ADD COLUMN role ENUM('admin', 'cajero', 'tecnico') DEFAULT 'cajero'");
            console.log("✅ Added 'role' column.");
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log("ℹ️ 'role' column already exists.");
            } else {
                console.error("❌ Error adding column:", e);
            }
        }

        // Set admin role for known admins
        await pool.query("UPDATE users SET role = 'admin' WHERE username IN ('admin', 'waskar', 'gerente')");
        console.log("✅ Updated admin roles.");

        pool.release();
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

updateSchema();
