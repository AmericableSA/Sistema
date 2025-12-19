const db = require('./config/db');

async function checkData() {
    try {
        console.log("Checking DB connection...");
        const [tRows] = await db.query("SELECT COUNT(*) as count FROM transactions");
        console.log("Transactions Count:", tRows[0].count);

        const [mRows] = await db.query("SELECT COUNT(*) as count FROM cash_movements");
        console.log("Cash Movements Count:", mRows[0].count);

        const [sampleT] = await db.query("SELECT * FROM transactions ORDER BY created_at DESC LIMIT 5");
        console.log("Latest Transactions:", sampleT);

        process.exit(0);
    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    }
}

checkData();
