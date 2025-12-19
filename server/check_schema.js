
const db = require('./config/db');

(async () => {
    try {
        console.log("--- COLUMNS ---");
        const [columns] = await db.query('SHOW COLUMNS FROM inventory_transactions');
        console.log(JSON.stringify(columns, null, 2));
        console.log("--- DONE ---");
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
