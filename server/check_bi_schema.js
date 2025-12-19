
const db = require('./config/db');

(async () => {
    try {
        console.log("--- PROVIDERS TABLE ---");
        try {
            const [cols] = await db.query('SHOW COLUMNS FROM providers');
            console.log(cols.map(c => c.Field).join(', '));
        } catch (e) { console.log("PROVIDERS TABLE MISSING"); }

        console.log("\n--- INVOICES TABLE ---");
        try {
            const [cols] = await db.query('SHOW COLUMNS FROM invoices');
            console.log(cols.map(c => c.Field).join(', '));
        } catch (e) { console.log("INVOICES TABLE MISSING"); }

        console.log("\n--- TRANSACTIONS TABLE ---");
        try {
            const [cols] = await db.query('SHOW COLUMNS FROM transactions');
            console.log(cols.map(c => c.Field).join(', '));
        } catch (e) { console.log("TRANSACTIONS TABLE MISSING"); }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
