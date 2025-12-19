const db = require('./server/config/db');

(async () => {
    try {
        console.log("--- USERS ---");
        const [users] = await db.query('SELECT id, username, full_name, role FROM users');
        console.log(JSON.stringify(users, null, 2));

        console.log("--- TRANSACTIONS SCHEMA ---");
        const [cols] = await db.query('SHOW COLUMNS FROM transactions');
        console.log(JSON.stringify(cols, null, 2));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
