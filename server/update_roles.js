const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

async function updateRoles() {
    try {
        console.log("Adding new roles to ENUM...");
        // This query modifies the column to include new roles
        await pool.query("ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'cajero', 'tecnico', 'bodeguero', 'oficinista') DEFAULT 'cajero'");
        console.log("✅ Roles updated successfully.");
    } catch (e) {
        console.error("❌ Error updating roles (might already exist):", e.message);
    } finally {
        pool.end();
    }
}

updateRoles();
