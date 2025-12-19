const db = require('./config/db');

async function checkInvoices() {
    try {
        const pool = await db.getConnection();
        const [tables] = await pool.query("SHOW TABLES LIKE 'invoices'");
        if (tables.length > 0) {
            console.log("✅ 'invoices' table FOUND.");
        } else {
            console.log("❌ 'invoices' table NOT FOUND.");
        }
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
checkInvoices();
