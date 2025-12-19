const db = require('./server/config/db');

(async () => {
    try {
        console.log("Checking for collector_id column...");
        const [rows] = await db.query("SHOW COLUMNS FROM transactions LIKE 'collector_id'");

        if (rows.length === 0) {
            console.log("Adding collector_id column...");
            await db.query("ALTER TABLE transactions ADD COLUMN collector_id INT DEFAULT NULL");
            console.log("Column added successfully.");
        } else {
            console.log("Column already exists.");
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
