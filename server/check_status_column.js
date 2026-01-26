const db = require('./config/db');

(async () => {
    try {
        console.log('Checking status column in clients table...');
        const [rows] = await db.query(`
            SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'clients' AND COLUMN_NAME = 'status'
        `, [process.env.DB_NAME]);

        console.log('Result:', rows);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
