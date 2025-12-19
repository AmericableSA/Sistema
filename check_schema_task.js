const db = require('./server/config/db');

(async () => {
    try {
        const [tables] = await db.query('SHOW TABLES');
        console.log('Tables:', tables.map(t => Object.values(t)[0]));

        const [cols] = await db.query(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
            FROM information_schema.columns 
            WHERE table_schema = '${process.env.DB_NAME}' AND table_name = 'transactions'
        `);
        console.log('Transactions Schema:', cols);

        const [clientCols] = await db.query('DESCRIBE clients');
        console.log('Clients Schema:', clientCols.map(c => `${c.Field} (${c.Type})`));

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
