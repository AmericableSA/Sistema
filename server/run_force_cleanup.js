const fs = require('fs');
const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '1987',
    database: process.env.DB_NAME || 'americable_db',
    multipleStatements: true
};

async function run() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database.');

        const sql = fs.readFileSync('../cleanup_users_force.sql', 'utf8');
        await connection.query(sql);

        console.log('Force Cleanup applied successfully.');
        await connection.end();
    } catch (error) {
        console.error('Force Cleanup failed:', error);
        process.exit(1);
    }
}

run();
