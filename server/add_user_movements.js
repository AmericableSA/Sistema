const db = require('./config/db');

async function migrate() {
    try {
        console.log('Checking cash_movements table...');
        const [rows] = await db.query("SHOW COLUMNS FROM cash_movements LIKE 'user_id'");

        if (rows.length === 0) {
            console.log('Adding user_id column...');
            await db.query("ALTER TABLE cash_movements ADD COLUMN user_id INT NULL AFTER session_id");
            console.log('Column added.');
        } else {
            console.log('Column user_id already exists.');
        }

        console.log('Migration complete.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
