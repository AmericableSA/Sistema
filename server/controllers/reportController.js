const db = require('../config/db');

// --- NEW ENDPOINTS FOR FINANCIAL DASHBOARD ---

// 1. Sales Summary (Ventas Brutas & Ganancia)
// 1. Sales Summary
exports.getSalesSummary = async (req, res) => {
    let pool;
    try {
        const { startDate, endDate } = req.query;
        pool = await db.getConnection();
        const [rows] = await pool.query(`
            SELECT 
                COALESCE(SUM(amount), 0) as ventas_brutas
            FROM transactions 
            WHERE type != 'void' 
            AND DATE(created_at) BETWEEN ? AND ?
        `, [startDate, endDate]);

        const ventas = parseFloat(rows[0].ventas_brutas);
        res.json({ ventas_brutas: ventas, ganancia_total: ventas * 0.3 });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'DB Error' });
    } finally {
        if (pool) pool.release();
    }
};

// 2. Inventory Value
// 2. Inventory Value
exports.getInventoryValue = async (req, res) => {
    let pool;
    try {
        pool = await db.getConnection();
        let val = 0;
        const [rows] = await pool.query("SELECT SUM(price * stock) as total FROM products");
        val = rows[0].total || 0;
        res.json({ valor_total_inventario: val });
    } catch (err) {
        res.status(500).json({ error: 'DB Error' });
    } finally {
        if (pool) pool.release();
    }
};

// 3. Sales By User
// 3. Sales By User
exports.getSalesByUser = async (req, res) => {
    let pool;
    try {
        const { startDate, endDate } = req.query;
        pool = await db.getConnection();
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
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'DB Error' });
    } finally {
        if (pool) pool.release();
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
    let pool;
    try {
        pool = await db.getConnection();

        // 1. Morosos 
        let morososCount = 0;
        let morososDebt = 0;
        const [mRows] = await pool.query(`
            SELECT COUNT(*) as c, SUM(TIMESTAMPDIFF(MONTH, last_paid_month, CURDATE()) * z.tariff * 1.05) as d 
            FROM clients c LEFT JOIN zones z ON c.zone_id = z.id
            WHERE c.status = 'active' AND c.last_paid_month < CURDATE()
        `);
        morososCount = mRows[0]?.c || 0;
        morososDebt = mRows[0]?.d || 0;

        // 2. Cortes vs Retirados
        const [sRows] = await pool.query("SELECT COUNT(*) as c FROM clients WHERE status = 'suspended'");
        const [rRows] = await pool.query("SELECT COUNT(*) as c FROM clients WHERE status IN ('retired', 'inactive', 'disconnected')");

        // NEW: Active Clients for Al Dia calculation
        const [activeRows] = await pool.query("SELECT COUNT(*) as c FROM clients WHERE status = 'active'");
        const activeCount = activeRows[0]?.c || 0;
        const alDiaCount = Math.max(0, activeCount - morososCount);

        // 3. New Installations
        const [nRows] = await pool.query(`
            SELECT COUNT(*) as c FROM clients 
            WHERE MONTH(installation_date) = MONTH(CURRENT_DATE()) AND YEAR(installation_date) = YEAR(CURRENT_DATE())
        `);

        // 4. Total
        const [tRows] = await pool.query("SELECT COUNT(*) as c FROM clients");

        res.json({
            morosos: { count: morososCount, deuda: morososDebt || 0 },
            al_dia: alDiaCount,
            suspendidos: sRows[0]?.c || 0,
            retirados: rRows[0]?.c || 0,
            instalaciones_mes: nRows[0]?.c || 0,
            total_clientes: tRows[0]?.c || 0
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Stats Error' });
    } finally {
        if (pool) pool.release();
    }
};

exports.getDailyClosing = async (req, res) => {
    let pool;
    try {
        const { startDate, endDate } = req.query;
        const sDate = startDate || new Date().toISOString().split('T')[0];
        const eDate = endDate || sDate;

        pool = await db.getConnection();

        // 1. Sales Income
        const [salesRows] = await pool.query(
            "SELECT SUM(amount) as total FROM transactions WHERE type != 'void' AND DATE(created_at) BETWEEN ? AND ?",
            [sDate, eDate]
        );
        const salesTotal = parseFloat(salesRows[0].total || 0);

        // 2. Manual Cash Movements
        const [moveRows] = await pool.query(
            "SELECT type, SUM(amount) as total FROM cash_movements WHERE DATE(created_at) BETWEEN ? AND ? GROUP BY type",
            [sDate, eDate]
        );

        let manualIn = 0;
        let manualOut = 0;
        moveRows.forEach(r => {
            if (r.type === 'IN') manualIn += parseFloat(r.total);
            else if (r.type === 'OUT') manualOut += parseFloat(r.total);
        });

        // 3. Breakdown by User
        const [userRows] = await pool.query(`
            SELECT COALESCE(u.username, 'Sistema') as username, SUM(t.amount) as total
            FROM transactions t
            LEFT JOIN users u ON t.collector_id = u.id
            WHERE t.type != 'void' AND DATE(t.created_at) BETWEEN ? AND ?
            GROUP BY t.collector_id, u.username
        `, [sDate, eDate]);

        res.json({
            ingresos: salesTotal + manualIn,
            egresos: manualOut,
            balance_dia: (salesTotal + manualIn) - manualOut,
            por_usuario: userRows
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Closing Error' });
    } finally {
        if (pool) pool.release();
    }
};

exports.getDashboardStats = async (req, res) => {
    res.json({}); // Placeholder if rarely used
};

// --- NEW BLOCKS FOR MOVEMENTS & SERVICE ORDERS ---

// 6. Movements (Trámites) Report
// 6. Movements (Trámites) Report
exports.getMovementsReport = async (req, res) => {
    let pool;
    try {
        const { startDate, endDate } = req.query;
        const sDate = startDate || new Date().toISOString().split('T')[0];
        const eDate = endDate || sDate;

        pool = await db.getConnection();

        const [rows] = await pool.query(`
            SELECT action, COUNT(*) as total FROM client_logs 
            WHERE DATE(timestamp) BETWEEN ? AND ? 
            GROUP BY action
        `, [sDate, eDate]);

        // Stats Map
        const stats = { CHANGE_NAME: 0, CHANGE_ADDRESS: 0, DISCONNECT_REQ: 0, DISCONNECT_MORA: 0, SERVICE_COMPLETED: 0 };
        rows.forEach(r => {
            if (stats[r.action] !== undefined) stats[r.action] = r.total;
            else if (r.action === 'SERVICE_COMPLETED') stats['SERVICE_COMPLETED'] = r.total;
        });

        res.json(stats);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Movements Error' });
    } finally {
        if (pool) pool.release();
    }
};

// 7. Service Orders Report
// 7. Service Orders Report
exports.getServiceOrdersReport = async (req, res) => {
    try {
        const { startDate, endDate, list, status } = req.query;
        const sDate = startDate || new Date().toISOString().split('T')[0];
        const eDate = endDate || sDate;
        const pool = await db.getConnection();

        // IF LIST IS REQUESTED (For ClientMovements View)
        if (list) {
            let query = `
                SELECT so.id, so.created_at, so.type, so.status, so.technician_notes as description,
                       c.full_name as client_name, c.id as client_id,
                       c.address_street, c.contract_number, c.status as client_status
                FROM service_orders so
                LEFT JOIN clients c ON so.client_id = c.id
            `;

            let params = [];

            if (status === 'PENDING') {
                // Show ALL pending, ignoring date
                query += ` WHERE so.status = 'PENDING'`;
            } else {
                // Show Daily List (Filter by Date Range)
                query += ` WHERE DATE(so.created_at) BETWEEN ? AND ?`;
                params.push(sDate, eDate);
            }

            query += ` ORDER BY so.created_at DESC LIMIT 100`;

            const [rows] = await pool.query(query, params);
            pool.release();
            return res.json(rows);
        }

        // ORIGINAL STATS LOGIC (For Reports Dashboard)

        // Count by Type
        const [typeRows] = await pool.query(`
            SELECT type, COUNT(*) as total 
            FROM service_orders 
            WHERE DATE(created_at) BETWEEN ? AND ?
            GROUP BY type
        `, [sDate, eDate]);

        // Count by Status
        const [statusRows] = await pool.query(`
            SELECT status, COUNT(*) as total 
            FROM service_orders 
            WHERE DATE(created_at) BETWEEN ? AND ?
            GROUP BY status
        `, [sDate, eDate]);

        pool.release();

        res.json({
            byType: typeRows,
            byStatus: statusRows
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Orders Error' });
    }
};
