const db = require('./config/db');

async function reset() {
    try {
        const pool = await db.getConnection();
        console.log("⚠️  STARTING OPERATIONAL DATA WIPE (Production Prep) ⚠️");

        // 1. Inventory Moves (Linked to Transactions)
        await pool.query("DELETE FROM inventory_moves");
        console.log("✅ Inventory History Cleared");

        // 2. Transactions (Linked to Clients & Sessions)
        await pool.query("DELETE FROM transactions");
        console.log("✅ Transactions Cleared");

        // 3. Cash Movements (Linked to Sessions)
        await pool.query("DELETE FROM cash_movements");
        console.log("✅ Cash Box Movements Cleared");

        // 4. Clients
        await pool.query("DELETE FROM clients");
        console.log("✅ Clients Database Cleared");

        // 5. Cash Sessions (Reset Cash Register)
        await pool.query("DELETE FROM cash_sessions");
        console.log("✅ Cash Sessions Reset");

        // 6. Reset IDs
        await pool.query("ALTER TABLE clients AUTO_INCREMENT = 1");
        await pool.query("ALTER TABLE transactions AUTO_INCREMENT = 1");
        await pool.query("ALTER TABLE cash_sessions AUTO_INCREMENT = 1");

        console.log("🚀 DATABASE READY FOR DEPLOY!");
        pool.release();
        process.exit();
    } catch (e) {
        console.error("❌ Error:", e.message);
        process.exit(1);
    }
}

reset();
