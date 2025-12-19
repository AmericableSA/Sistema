const db = require('./config/db');

async function testReports() {
    try {
        const pool = await db.getConnection();
        const today = new Date().toISOString().split('T')[0];
        const startDate = today;
        const endDate = today;
        const zone_id = null;
        const collector_id = null;

        // Helper from controller
        const buildQuery = (baseTable, dateCol, isTransaction = true) => {
            let sql = ` WHERE DATE(${baseTable}.${dateCol}) BETWEEN ? AND ? `;
            let qParams = [startDate, endDate];
            return { sql, params: qParams };
        };

        console.log("Testing Report Queries...");

        // 1. Client Stats
        console.log("1. Client Stats");
        const [clientStats] = await pool.query(`SELECT status, COUNT(*) as count FROM clients GROUP BY status`);
        console.log("Client Stats Result:", clientStats);

        // 2. Financials
        console.log("2. Financials");
        const transTable = "transactions t";
        const transQ = buildQuery('t', 'created_at', true);
        const [financials] = await pool.query(`
            SELECT 
                COALESCE(SUM(t.amount), 0) as income,
                COUNT(t.id) as tx_count,
                COALESCE(AVG(t.amount), 0) as avg_ticket
            FROM ${transTable}
            ${transQ.sql}
        `, transQ.params);
        console.log("Financials Result:", financials);

        // 3. Transactions Query Construction Check
        const uniqueClientsQuery = `
            SELECT COUNT(DISTINCT t.client_id) as count
            FROM ${transTable}
            ${transQ.sql}
            AND t.type = 'IN'
        `;
        console.log("Unique Clients Query:", uniqueClientsQuery);
        const [uniqueClients] = await pool.query(uniqueClientsQuery, transQ.params);
        console.log("Unique Clients:", uniqueClients);

        // 4. Session Query
        console.log("4. Sessions");
        let sessionSql = "SELECT cs.*, u.username FROM cash_sessions cs JOIN users u ON cs.user_id = u.id WHERE DATE(cs.opened_at) BETWEEN ? AND ?";
        let sessionParams = [startDate, endDate];
        const [sessions] = await pool.query(sessionSql, sessionParams);
        console.log("Sessions:", sessions);

        console.log("✅ Test Complete");
        pool.release();
        process.exit(0);

    } catch (err) {
        console.error("❌ Error:", err);
        process.exit(1);
    }
}

testReports();
