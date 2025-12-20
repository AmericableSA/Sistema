const db = require('../config/db');

// --- NEW ENDPOINTS FOR FINANCIAL DASHBOARD ---

// 1. Sales Summary (Ventas Brutas & Ganancia)
exports.getSalesSummary = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const pool = await db.getConnection();
        const [rows] = await pool.query(`
            SELECT 
                COALESCE(SUM(amount), 0) as ventas_brutas
            FROM transactions 
            WHERE type != 'void' 
            AND DATE(created_at) BETWEEN ? AND ?
        `, [startDate, endDate]);
        pool.release();

        const ventas = parseFloat(rows[0].ventas_brutas);
        res.json({ ventas_brutas: ventas, ganancia_total: ventas * 0.3 }); // Approx 30% margin
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'DB Error' });
    }
};

// 2. Inventory Value
exports.getInventoryValue = async (req, res) => {
    try {
        const pool = await db.getConnection();
        let val = 0;
        try {
            const [rows] = await pool.query("SELECT SUM(price * stock) as total FROM products");
            val = rows[0].total || 0;
        } catch (e) { }

        pool.release();
        res.json({ valor_total_inventario: val });
    } catch (err) {
        res.status(500).json({ error: 'DB Error' });
    }
};

// 3. Sales By User
exports.getSalesByUser = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const pool = await db.getConnection();
        const [rows] = await pool.query(`
            SELECT 
                COALESCE(u.username, 'Sin Asignar') as nombre_usuario, 
                SUM(t.amount) as total_vendido
            FROM transactions t
            LEFT JOIN users u ON t.collector_id = u.id
            WHERE t.type != 'void'
            AND DATE(t.created_at) BETWEEN ? AND ?
            GROUP BY t.collector_id, u.username
            ORDER BY total_vendido DESC
            LIMIT 5
        `, [startDate, endDate]);
        pool.release();
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'DB Error' });
    }
};

// 4. Top Products
exports.getTopProducts = async (req, res) => {
    res.json([]);
};

// 5. Sales Chart
exports.getSalesChart = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const pool = await db.getConnection();
        const [rows] = await pool.query(`
            SELECT DATE(created_at) as dia, SUM(amount) as total_diario
            FROM transactions
            WHERE type != 'void'
            AND DATE(created_at) BETWEEN ? AND ?
            GROUP BY DATE(created_at)
            ORDER BY dia ASC
        `, [startDate, endDate]);
        pool.release();
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'DB Error' });
    }
};

// --- CABLE TV SPECIFIC REPORTING ---

exports.getCableStats = async (req, res) => {
    try {
        const pool = await db.getConnection();

        // 1. Morosos 
        // Logic: Active clients whose "Vencimiento" (last_paid_month) is in the past.
        let morososCount = 0;
        let morososDebt = 0;
        try {
            const [mRows] = await pool.query(`
                SELECT 
                    COUNT(*) as c, 
                    SUM(
                        TIMESTAMPDIFF(MONTH, last_paid_month, CURDATE()) * z.tariff * 1.05
                    ) as d 
                FROM clients c
                LEFT JOIN zones z ON c.zone_id = z.id
                WHERE c.status = 'active' 
                AND c.last_paid_month < CURDATE()
            `);
            morososCount = mRows[0].c;
            morososDebt = mRows[0].d;
        } catch (e) { console.log("Error fetching morosos:", e.message); }

        // 2. Cortes (Suspendidos) vs Retirados
        // UI shows "Cortados", "Retirados".
        // Cortados = status 'suspended'
        let suspendidosCount = 0;
        let retiradosCount = 0;
        try {
            const [sRows] = await pool.query("SELECT COUNT(*) as c FROM clients WHERE status = 'suspended'");
            suspendidosCount = sRows[0].c;

            const [rRows] = await pool.query("SELECT COUNT(*) as c FROM clients WHERE status IN ('retired', 'inactive', 'disconnected')");
            retiradosCount = rRows[0].c;
        } catch (e) { }

        // 3. New Installations (This Month)
        // Correct Logic: Use 'installation_date' 
        let newCount = 0;
        try {
            const [nRows] = await pool.query(`
                SELECT COUNT(*) as c 
                FROM clients 
                WHERE MONTH(installation_date) = MONTH(CURRENT_DATE()) 
                AND YEAR(installation_date) = YEAR(CURRENT_DATE())
            `);
            newCount = nRows[0].c;
        } catch (e) { }

        // 4. Total Clients (Base Total)
        let totalCount = 0;
        const [tRows] = await pool.query("SELECT COUNT(*) as c FROM clients");
        totalCount = tRows[0].c;

        pool.release();
        res.json({
            morosos: { count: morososCount, deuda: morososDebt || 0 },
            suspendidos: suspendidosCount, // "Cortados"
            retirados: retiradosCount,
            instalaciones_mes: newCount,
            total_clientes: totalCount
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Stats Error' });
    }
};

exports.getDailyClosing = async (req, res) => {
    try {
        const date = req.query.date || new Date().toISOString().split('T')[0];
        const pool = await db.getConnection();

        // 1. Sales Income (Transactions)
        const [salesRows] = await pool.query(
            "SELECT SUM(amount) as total FROM transactions WHERE type != 'void' AND DATE(created_at) = ?",
            [date]
        );
        const salesTotal = parseFloat(salesRows[0].total || 0);

        // 2. Manual Cash Movements
        const [moveRows] = await pool.query(
            "SELECT type, SUM(amount) as total FROM cash_movements WHERE DATE(created_at) = ? GROUP BY type",
            [date]
        );

        let manualIn = 0;
        let manualOut = 0;
        moveRows.forEach(r => {
            if (r.type === 'IN') manualIn += parseFloat(r.total);
            else if (r.type === 'OUT') manualOut += parseFloat(r.total);
        });

        // 3. Breakdown by User (Sales Only)
        const [userRows] = await pool.query(`
            SELECT COALESCE(u.username, 'Sistema') as username, SUM(t.amount) as total
            FROM transactions t
            LEFT JOIN users u ON t.collector_id = u.id
            WHERE t.type != 'void' AND DATE(t.created_at) = ?
            GROUP BY t.collector_id, u.username
        `, [date]);

        pool.release();

        const totalIngresos = salesTotal + manualIn;
        const totalEgresos = manualOut;

        res.json({
            ingresos: totalIngresos,
            egresos: totalEgresos,
            balance_dia: totalIngresos - totalEgresos,
            por_usuario: userRows
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Closing Error' });
    }
};

exports.getDashboardStats = async (req, res) => {
    res.json({}); // Placeholder if rarely used
};

// 6. Cash History
exports.getCashHistory = async (req, res) => {
    try {
        const pool = await db.getConnection();
        const [rows] = await pool.query(`
            SELECT cr.*, u.username 
            FROM cash_reports cr 
            LEFT JOIN users u ON cr.user_id = u.id 
            ORDER BY cr.closing_date DESC 
            LIMIT 30
        `);
        pool.release();
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'DB Error' });
    }
};
