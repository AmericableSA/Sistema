const db = require('./config/db');

const newStatuses = ['promotions', 'courtesy', 'provider', 'office'];

async function run() {
    try {
        console.log('Checking status column type...');
        const [rows] = await db.query("SHOW COLUMNS FROM clients LIKE 'status'");

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
                    await db.query(alterQuery);
                    console.log('Migration successful: Statuses added.');
                } else {
                    console.log('All new statuses already exist. No update needed.');
                }
            }
        } else {
            console.log('Column is not an ENUM (likely VARCHAR or TEXT). No schema change required.');
        }

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        // We cannot close the pool explicitly if other parts of app use it, but since this is a standalone run, we can try
        // or just let the process exit. db.end() is not exposed on the pool directly in usual mysql2/promise `require` if it's a pool object.
        // Actually pool.end() exists.
        if (db && db.end) await db.end();
        process.exit(0);
    }
}

run();
