const fs = require('fs');
const path = require('path');
const db = require('./config/db');

const sqlFile = process.argv[2];

if (!sqlFile) {
    console.error('Please provide a SQL file to execute.');
    process.exit(1);
}

const filePath = path.join(__dirname, '..', sqlFile);
const sql = fs.readFileSync(filePath, 'utf8');

const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

(async () => {
    try {
        console.log(`Executing SQL from ${sqlFile}...`);
        const connection = await db.getConnection(); // Get a connection from the pool
        try {
            for (const statement of statements) {
                // Skip DELIMITER logic if simple file, or handle simplistic buffer
                if (statement.toUpperCase().startsWith('DELIMITER')) continue;

                await connection.query(statement);
            }
            console.log('SQL Executed Successfully.');
        } finally {
            connection.release();
        }
        process.exit(0);
    } catch (err) {
        console.error('Error executing SQL:', err);
        process.exit(1);
    }
})();
