const mysql = require('mysql2/promise');

async function migrate() {
    const pool = mysql.createPool({
        host: '127.0.0.1',
        user: 'admin_sistema',
        password: 'y',
        database: 'americable',
        port: 3306
    });

    try {
        console.log('Connecting...');
        const conn = await pool.getConnection();
        console.log('Connected!');

        console.log('Checking user_id in cash_movements...');
        const [rows] = await conn.query("SHOW COLUMNS FROM cash_movements LIKE 'user_id'");

        if (rows.length === 0) {
            console.log('Adding user_id column...');
            await conn.query("ALTER TABLE cash_movements ADD COLUMN user_id INT NULL AFTER session_id");
            console.log('Column added successfully.');
        } else {
            console.log('Column user_id already exists.');
        }

        conn.release();
        process.exit(0);
    } catch (error) {
        console.error('Migration Error:', error);
        process.exit(1);
    }
}

migrate();
