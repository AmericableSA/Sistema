const db = require('./config/db');

async function diagnose() {
    console.log("🔍 STARTING SYSTEM DIAGNOSIS");
    const pool = await db.getConnection();

    try {
        // 1. Check Tables
        console.log("\n1️⃣ CHECKING DATABASE TABELS...");
        const [tables] = await pool.query("SHOW TABLES");
        const tableNames = tables.map(t => Object.values(t)[0]);
        console.log("   Found Tables:", tableNames.join(', '));

        if (!tableNames.includes('invoices')) {
            console.error("   ❌ CRITICAL: 'invoices' table is MISSING!");
        } else {
            console.log("   ✅ 'invoices' table exists.");
        }

        // 2. Check Invoices Schema
        if (tableNames.includes('invoices')) {
            console.log("\n2️⃣ CHECKING INVOICES SCHEMA...");
            const [invCols] = await pool.query("SHOW COLUMNS FROM invoices");
            console.log("   Columns:", invCols.map(c => c.Field).join(', '));
        }

        // 3. Check Transactions Schema (for collector_id)
        console.log("\n3️⃣ CHECKING TRANSACTIONS SCHEMA...");
        const [transCols] = await pool.query("SHOW COLUMNS FROM transactions");
        const transFields = transCols.map(c => c.Field);
        console.log("   Columns:", transFields.join(', '));
        if (transFields.includes('collector_id')) console.log("   ✅ 'collector_id' column present.");
        else console.error("   ❌ 'collector_id' column MISSING");

        // 4. Test Report Query (User Performance)
        console.log("\n4️⃣ TESTING REPORT QUERY (User Performance)...");
        try {
            const userQ = `
                SELECT 
                    u.full_name, 
                    count(t.id) as count
                FROM transactions t
                LEFT JOIN users u ON t.collector_id = u.id
                GROUP BY t.collector_id, u.full_name
                LIMIT 1
            `;
            await pool.query(userQ);
            console.log("   ✅ Report Query PASSED.");
        } catch (err) {
            console.error("   ❌ Report Query FAILED:", err.code, err.sqlMessage);
        }

    } catch (err) {
        console.error("❌ GLOBAL DIAGNOSIS ERROR:", err);
    } finally {
        pool.release();
        process.exit();
    }
}

diagnose();
