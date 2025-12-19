const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

async function fixRoles() {
    try {
        console.log("Standardizing roles...");
        await pool.query("UPDATE users SET role='oficinista' WHERE role='oficina'");
        await pool.query("UPDATE users SET role='bodeguero' WHERE role='warehouse'");
        await pool.query("UPDATE users SET role='cajero' WHERE role='collector'");
        await pool.query("UPDATE users SET role='tecnico' WHERE role='technician'");
        console.log("✅ Roles normalized.");
    } catch (e) {
        console.error("❌ Error:", e.message);
    } finally {
        pool.end();
    }
}

fixRoles();
