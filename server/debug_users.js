const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

async function checkUsers() {
    try {
        const [rows] = await pool.query("SELECT id, username, role, password_hash FROM users");
        // Print safely (truncate hash for readability if needed, but we need to see if it looks like bcrypt)
        console.log("--- USERS DUMP ---");
        rows.forEach(u => {
            const hashStart = u.password_hash ? u.password_hash.substring(0, 10) : 'NULL';
            const isBcrypt = hashStart.startsWith('$2');
            console.log(`User: ${u.username} | Role: '${u.role}' | HashStart: ${hashStart} | IsBcrypt: ${isBcrypt}`);
        });

        // Also check Enum definition
        const [cols] = await pool.query("SHOW COLUMNS FROM users LIKE 'role'");
        console.log("--- ENUM DEFINITION ---");
        console.log(cols[0].Type);

    } catch (e) {
        console.error("❌ Error:", e.message);
    } finally {
        pool.end();
    }
}

checkUsers();
