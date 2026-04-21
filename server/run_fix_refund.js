const db = require('./config/db');

async function fix() {
    try {
        const [result] = await db.query("DELETE FROM cash_movements WHERE type='REFUND' OR (type='OUT' AND description LIKE '%[REEMB]%')");
        console.log("Deleted", result.affectedRows);
    } catch(e) {
        console.error("Oops", e);
    }
    process.exit();
}

fix();
