const db = require('./config/db');

async function debugReports() {
    const pool = await db.getConnection();
    const startDate = new Date().toISOString().split('T')[0];
    const endDate = startDate;
    const zone_id = null;
    const collector_id = null;

    console.log("--- START DEBUG ---");

    try {
        // 1. Client Stats
        console.log("1. Testing Client Stats...");
        await pool.query(`SELECT status, COUNT(*) as count FROM clients GROUP BY status`);
        console.log("   PASS");

        // 2. Financials
        console.log("2. Testing Financials...");
        const transTable = "transactions t";
        const sql = `WHERE DATE(t.created_at) BETWEEN ? AND ?`;
        const params = [startDate, endDate];

        await pool.query(`
            SELECT 
                COALESCE(SUM(t.amount), 0) as income,
                COUNT(t.id) as tx_count,
                COALESCE(AVG(t.amount), 0) as avg_ticket
            FROM ${transTable}
            ${sql}
        `, params);
        console.log("   PASS");

        // 3. Unique Clients
        console.log("3. Testing Unique Clients...");
        await pool.query(`
            SELECT COUNT(DISTINCT t.client_id) as count
            FROM ${transTable}
            ${sql}
            AND t.type = 'IN'
        `, params);
        console.log("   PASS");

        // 4. Sessions
        console.log("4. Testing Sessions...");
        await pool.query(`
            SELECT cs.*, u.username 
            FROM cash_sessions cs 
            JOIN users u ON cs.user_id = u.id 
            WHERE DATE(cs.opened_at) BETWEEN ? AND ?
        `, params);
        console.log("   PASS");

        // 5. User Performance
        console.log("5. Testing User Performance...");
        const userQ = `
            SELECT 
                u.full_name, 
                u.username, 
                COALESCE(SUM(t.amount), 0) as total,
                COUNT(t.id) as tx_count
            FROM transactions t
            LEFT JOIN users u ON t.collector_id = u.id
            ${sql}
            GROUP BY t.collector_id, u.full_name, u.username
        `;
        await pool.query(userQ, params);
        console.log("   PASS");

        // 6. Zones
        console.log("6. Testing Zones...");
        await pool.query(`
            SELECT 
                COALESCE(z.name, 'Sin Zona') as name, 
                COUNT(c.id) as value
            FROM clients c
            LEFT JOIN zones z ON c.zone_id = z.id
            WHERE c.status = 'active'
            GROUP BY z.id, z.name
            LIMIT 8
         `);
        console.log("   PASS");

        // 7. Delinquency
        console.log("7. Testing Delinquency...");
        await pool.query(`
            SELECT 
                COUNT(*) as count,
                SUM(TIMESTAMPDIFF(MONTH, last_paid_month, CURDATE())) as months_total
            FROM clients 
            WHERE status = 'active' 
            AND last_paid_month < DATE_SUB(CURDATE(), INTERVAL 1 MONTH)
         `);
        console.log("   PASS");

    } catch (err) {
        console.error("\n❌ PREVIOUS STEP FAILED ❌");
        console.error(err.code, err.sqlMessage);
        console.error("Query:", err.sql);
    } finally {
        pool.release();
        process.exit();
    }
}

debugReports();
