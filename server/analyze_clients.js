const db = require('./config/db');

async function analyzeClients() {
    try {
        const pool = await db.getConnection();
        console.log("--- CLIENTS ANALYSIS ---");

        // 1. Check Status Distribution
        const [statuses] = await pool.query("SELECT status, COUNT(*) as count FROM clients GROUP BY status");
        console.log("Statuses:", statuses);

        // 2. Check Balance/Mora
        // Try to find columns related to debt
        const [columns] = await pool.query("DESCRIBE clients");
        const colNames = columns.map(c => c.Field);
        console.log("Columns:", colNames);

        if (colNames.includes('balance')) {
            const [debt] = await pool.query("SELECT COUNT(*) as count, SUM(balance) as total FROM clients WHERE balance > 0");
            console.log("Clients with Balance > 0:", debt[0]);
        }

        // 3. Check Created_at (for New Installations)
        const [dates] = await pool.query("SELECT MIN(created_at) as min_date, MAX(created_at) as max_date, COUNT(*) as total FROM clients");
        console.log("Date Range:", dates[0]);

        // 4. Check 'Nuevas Instalaciones' Logic (Current Month)
        const [newInst] = await pool.query("SELECT COUNT(*) as count FROM clients WHERE MONTH(created_at) = MONTH(CURRENT_DATE()) AND YEAR(created_at) = YEAR(CURRENT_DATE())");
        console.log("New Installations (Current Month Query):", newInst[0].count);

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

analyzeClients();
