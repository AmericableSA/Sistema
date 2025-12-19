const db = require('./config/db');

(async () => {
    try {
        const [rows] = await db.query('DESCRIBE transactions');
        console.log(JSON.stringify(rows.map(r => r.Field), null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
