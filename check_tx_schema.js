const db = require('./server/config/db');

(async () => {
    try {
        console.log("--- COLUMNS transactions ---");
        const [columns] = await db.query('SHOW COLUMNS FROM transactions');
        console.log(JSON.stringify(columns, null, 2));

        console.log("--- COLUMNS cash_sessions ---");
        const [sessionCols] = await db.query('SHOW COLUMNS FROM cash_sessions');
        console.log(JSON.stringify(sessionCols, null, 2));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
