const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

async function forceFix() {
    try {
        console.log("--- BEFORE ---");
        const [rows] = await pool.query("SELECT id, username, role FROM users");
        console.table(rows);

        // Force updates
        console.log("Updating...");
        await pool.query("UPDATE users SET role='oficinista' WHERE role LIKE 'oficina%'");
        await pool.query("UPDATE users SET role='bodeguero' WHERE role LIKE 'warehouse%' OR role LIKE 'bodega%'");
        await pool.query("UPDATE users SET role='cajero' WHERE role LIKE 'cajero' OR role LIKE 'collector%'");
        await pool.query("UPDATE users SET role='tecnico' WHERE role LIKE 'technician%' OR role LIKE 'tecnic%'");
        await pool.query("UPDATE users SET role='admin' WHERE role LIKE 'admin%'");

        console.log("--- AFTER ---");
        const [rowsAfter] = await pool.query("SELECT id, username, role FROM users");
        console.table(rowsAfter);

    } catch (e) {
        console.error("❌ Error:", e.message);
    } finally {
        pool.end();
    }
}

forceFix();
