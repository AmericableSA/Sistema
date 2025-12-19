const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

async function fixAll() {
    try {
        console.log("1️⃣ Expanding ENUM to include legacy + new...");
        // This accepts EVERYTHING so we can migrate safely
        await pool.query("ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'cajero', 'tecnico', 'bodeguero', 'oficinista', 'oficina', 'warehouse', 'collector', 'technician') DEFAULT 'oficinista'");

        console.log("2️⃣ Migrating Data...");
        await pool.query("UPDATE users SET role='oficinista' WHERE role='oficina'");
        await pool.query("UPDATE users SET role='bodeguero' WHERE role='warehouse'");
        await pool.query("UPDATE users SET role='cajero' WHERE role='collector'");
        await pool.query("UPDATE users SET role='tecnico' WHERE role='technician'");

        console.log("3️⃣ Cleaning up ENUM...");
        // Now remove the old ones
        await pool.query("ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'cajero', 'tecnico', 'bodeguero', 'oficinista') DEFAULT 'oficinista'");

        console.log("4️⃣ Resetting Waskar Password...");
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash('1987', salt);
        // Note: Assuming username is 'waskar' or 'admin' (from screenshot 'Admin Waskar', user might be 'waskar')
        // We'll update where username='waskar'
        const [res] = await pool.query("UPDATE users SET password_hash = ? WHERE username = 'waskar'", [hash]);
        if (res.affectedRows === 0) {
            console.log("⚠️ Warning: User 'waskar' not found. Trying 'admin' if name is waskar?");
        } else {
            console.log("✅ Password updated for 'waskar'.");
        }

        console.log("--- FINAL STATUS ---");
        const [rows] = await pool.query("SELECT username, role, password_hash FROM users");
        rows.forEach(r => console.log(`${r.username} -> ${r.role} (Hash: ${r.password_hash.substring(0, 10)}...)`));

    } catch (e) {
        console.error("❌ Error:", e.message);
    } finally {
        pool.end();
    }
}

fixAll();
