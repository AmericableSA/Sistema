require('dotenv').config({ path: './server/.env' });
const mysql = require('mysql2/promise');

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'americable_db'
};

const newStatuses = ['promotions', 'courtesy', 'provider', 'office'];

async function run() {
    let connection;
    try {
        console.log('Connecting to database...');
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected.');

        console.log('Checking status column type...');
        const [rows] = await connection.query("SHOW COLUMNS FROM clients LIKE 'status'");

        if (rows.length === 0) {
            console.error('Column status not found in clients table.');
            process.exit(1);
        }

        const columnType = rows[0].Type.toLowerCase();
        console.log(`Current type: ${columnType}`);

        if (columnType.includes('enum')) {
            // Extract existing values
            const match = columnType.match(/enum\((.*)\)/);
            if (match) {
                let existingValues = match[1].split(',').map(v => v.trim().replace(/'/g, ''));
                console.log('Existing statuses:', existingValues);

                let needsUpdate = false;
                for (const s of newStatuses) {
                    if (!existingValues.includes(s)) {
                        existingValues.push(s);
                        needsUpdate = true;
                    }
                }

                if (needsUpdate) {
                    console.log('Updating ENUM definition...');
                    const newEnumString = existingValues.map(v => `'${v}'`).join(',');
                    const alterQuery = `ALTER TABLE clients MODIFY COLUMN status ENUM(${newEnumString}) DEFAULT 'active'`;
                    console.log('Running:', alterQuery);
                    await connection.query(alterQuery);
                    console.log('Migration successful: Statuses added.');
                } else {
                    console.log('All new statuses already exist. No update needed.');
                }
            }
        } else {
            console.log('Column is not an ENUM (likely VARCHAR). No schema change required.');
        }

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        if (connection) await connection.end();
    }
}

run();
