const db = require('../config/db');

// Helper timezone-safe para obtener la fecha de hoy en Nicaragua (formato YYYY-MM-DD)
const getTodayManagua = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Managua' });

// Helper timezone-safe para formatear fechas a DD/MM/YYYY sin corrimientos de huso horario
const formatDateDMY = (date) => {
    if (!date) return 'N/A';
    try {
        let dateStr;
        if (typeof date === 'string') {
            dateStr = date.split('T')[0];
        } else if (date instanceof Date) {
            dateStr = date.toLocaleDateString('sv-SE', { timeZone: 'America/Managua' });
        } else {
            dateStr = new Date(date).toLocaleDateString('sv-SE', { timeZone: 'America/Managua' });
        }
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return dateStr;
    } catch (e) {
        return String(date);
    }
};

// Helper timezone-safe para formatear fechas y horas en la zona horaria de Nicaragua
const formatDateTimeManagua = (date) => {
    if (!date) return 'N/A';
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return String(date);
        return d.toLocaleString('es-NI', { timeZone: 'America/Managua', hour12: true });
    } catch (e) {
        return String(date);
    }
};

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
            WHERE (status = 'SUCCESS' OR status = 'COMPLETED') AND type != 'void' 
            AND DATE(CONVERT_TZ(created_at, '+00:00', '-06:00')) BETWEEN ? AND ?
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

// 3. Sales By User (Extended for Performance Report)
exports.getSalesByUser = async (req, res) => {
    let pool;
    try {
        const { startDate, endDate } = req.query;
        pool = await db.getConnection();
        const [rows] = await pool.query(`
            SELECT 
                COALESCE(u.username, 'Sin Asignar') as nombre_usuario, 
                SUM(t.amount) as total_vendido,
                COUNT(*) as cant_transacciones,
                COALESCE(u.full_name, 'Sin Asignar') as nombre_completo
            FROM transactions t
            LEFT JOIN users u ON t.collector_id = u.id
            WHERE (t.status = 'SUCCESS' OR t.status = 'COMPLETED') AND t.type != 'void'
            AND DATE(CONVERT_TZ(t.created_at, '+00:00', '-06:00')) BETWEEN ? AND ?
            GROUP BY t.collector_id, u.username, u.full_name
            ORDER BY total_vendido DESC
        `, [startDate, endDate]);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'DB Error' });
    } finally {
        if (pool) pool.release();
    }
};

// New Collector Performance Detailed
exports.getCollectorPerformance = async (req, res) => {
    let pool;
    try {
        const { startDate, endDate } = req.query;
        pool = await db.getConnection();
        const [rows] = await pool.query(`
            SELECT 
                u.id,
                u.username,
                u.full_name,
                COUNT(t.id) as total_recibos,
                SUM(t.amount) as total_cobrado,
                AVG(t.amount) as promedio_recibo,
                MAX(t.created_at) as ultimo_cobro
            FROM users u
            JOIN transactions t ON u.id = t.collector_id
            WHERE t.type != 'void'
            AND DATE(CONVERT_TZ(t.created_at, '+00:00', '-06:00')) BETWEEN ? AND ?
            GROUP BY u.id, u.username, u.full_name
            ORDER BY total_cobrado DESC
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
            WHERE (status = 'SUCCESS' OR status = 'COMPLETED') AND type != 'void'
            AND DATE(CONVERT_TZ(created_at, '+00:00', '-06:00')) BETWEEN ? AND ?
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
        const { startDate, endDate } = req.query;
        // Default to current month for stats if not provided? Or just ignore dates for snapshot stats?
        // User wants "of the date", so let's respect the range if provided, otherwise maybe all time?
        // Actually, Reports.jsx passes today by default if we hook it up.
        // Let's use provided dates or default to 'all time' for attended to avoid confusion? 
        // No, 'de la fecha' implies date filter.

        const sDate = startDate || getTodayManagua();
        const eDate = endDate || sDate;

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

        // 2. Cortes vs Retirados vs Solicitud
        const [sRows] = await pool.query("SELECT COUNT(*) as c FROM clients WHERE status = 'suspended'"); // Cortado por mora
        const [rRows] = await pool.query("SELECT COUNT(*) as c FROM clients WHERE status NOT IN ('active', 'suspended', 'disconnected_by_request')");
        const [discReqRows] = await pool.query("SELECT COUNT(*) as c FROM clients WHERE status = 'disconnected_by_request'"); // Corte a solicitud

        // NEW: Active Clients for Al Dia calculation
        const [activeRows] = await pool.query("SELECT COUNT(*) as c FROM clients WHERE status = 'active'");
        const activeCount = activeRows[0]?.c || 0;
        const alDiaCount = Math.max(0, activeCount - morososCount);

        // 3. New Installations (Use Date Range if provided? Or keep monthly context? Let's keep monthly for this specific stat as it says "instalaciones_mes")
        const [nRows] = await pool.query(`
            SELECT COUNT(*) as c FROM clients 
            WHERE MONTH(installation_date) = MONTH(CURRENT_DATE()) AND YEAR(installation_date) = YEAR(CURRENT_DATE())
        `);

        // 4. Total
        const [tRows] = await pool.query("SELECT COUNT(*) as c FROM clients");

        // 5. Averias Pendientes (Snapshot, always all pending)
        const [avRows] = await pool.query("SELECT COUNT(*) as c FROM averias WHERE estado = 'Pendiente'");

        // 6. Contactos Pendientes (Snapshot, always all pending)
        const [contactRows] = await pool.query("SELECT COUNT(*) as c FROM contactos WHERE atendido = 0");

        // 7. NEW: Averias Atendidas (In Date Range)
        const [avAttendedRows] = await pool.query(`
            SELECT COUNT(*) as c FROM averias 
            WHERE estado IN ('Revisado', 'Atendido') 
            AND DATE(fecha_reporte) BETWEEN ? AND ?
        `, [sDate, eDate]);

        // 8. NEW: Contactos Atendidos (In Date Range)
        const [contactAttendedRows] = await pool.query(`
            SELECT COUNT(*) as c FROM contactos 
            WHERE atendido = 1 
            AND DATE(fecha_contacto) BETWEEN ? AND ?
        `, [sDate, eDate]);

        res.json({
            morosos: { count: morososCount, deuda: morososDebt || 0 },
            al_dia: alDiaCount,
            clientes_activos: activeCount,
            suspendidos: sRows[0]?.c || 0,             // Cortado por mora/deuda
            desconectados_solicitud: discReqRows[0]?.c || 0, // Corte voluntario a solicitud
            retirados: rRows[0]?.c || 0,
            instalaciones_mes: nRows[0]?.c || 0,
            total_clientes: tRows[0]?.c || 0,
            averias_pendientes: avRows[0]?.c || 0,
            contactos_pendientes: contactRows[0]?.c || 0,
            averias_atendidas: avAttendedRows[0]?.c || 0,
            contactos_atendidos: contactAttendedRows[0]?.c || 0
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
        const sDate = startDate || getTodayManagua();
        const eDate = endDate || sDate;

        pool = await db.getConnection();

        // 1. Sales Income (S├│lo comprobantes no anulados y con estado exitoso)
        const [salesRows] = await pool.query(
            "SELECT SUM(amount) as total FROM transactions WHERE (status = 'SUCCESS' OR status = 'COMPLETED') AND type != 'void' AND DATE(CONVERT_TZ(created_at, '+00:00', '-06:00')) BETWEEN ? AND ?",
            [sDate, eDate]
        );
        const salesTotal = parseFloat(salesRows[0].total || 0);

        // 2. Manual Cash Movements (Detecting Refunds by type or prefix)
        const [moveRows] = await pool.query(
            "SELECT type, amount, description FROM cash_movements WHERE DATE(created_at) BETWEEN ? AND ?",
            [sDate, eDate]
        );

        let manualIn = 0;
        let manualOut = 0;
        let devoluciones = 0;
        moveRows.forEach(r => {
            if (r.type === 'IN') {
                manualIn += parseFloat(r.amount);
            } else if (r.type === 'REFUND') {
                devoluciones += parseFloat(r.amount);
            } else if (r.type === 'OUT') {
                // Check for refund prefix in fallback scenario
                if (r.description && r.description.includes('[REEMB]')) {
                    devoluciones += parseFloat(r.amount);
                } else {
                    manualOut += parseFloat(r.amount);
                }
            }
        });

        // 3. Breakdown by User
        const [userRows] = await pool.query(`
            SELECT COALESCE(u.username, 'Sistema') as username, SUM(t.amount) as total
            FROM transactions t
            LEFT JOIN users u ON t.collector_id = u.id
            WHERE (t.status = 'SUCCESS' OR t.status = 'COMPLETED') AND t.type != 'void' AND DATE(CONVERT_TZ(t.created_at, '+00:00', '-06:00')) BETWEEN ? AND ?
            GROUP BY t.collector_id, u.username
        `, [sDate, eDate]);

        // 4. Session Closures (for Auditing)
        const [sessionRows] = await pool.query(`
            SELECT s.id, s.session_type, s.start_time, s.end_time, s.status, 
                   s.start_amount, s.end_amount_system, s.end_amount_physical, 
                   s.difference, s.closing_note, u.username
            FROM cash_sessions s
            LEFT JOIN users u ON s.user_id = u.id
            WHERE DATE(s.start_time) BETWEEN ? AND ?
            ORDER BY s.start_time DESC
        `, [sDate, eDate]);

        res.json({
            ingresos: salesTotal + manualIn,
            egresos: manualOut,
            devoluciones: devoluciones,
            balance_dia: (salesTotal + manualIn) - manualOut - devoluciones,
            por_usuario: userRows,
            sesiones: sessionRows
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

// 6. Detailed Daily Report (Bitacora) - SPLIT VIEW
exports.getDailyDetails = async (req, res) => {
    let pool;
    try {
        const { startDate, endDate } = req.query;
        // Default to today if not provided
        const sDate = startDate || getTodayManagua();
        const eDate = endDate || sDate;

        pool = await db.getConnection();

        // 0. Fetch Sessions (To see who opened/closed)
        const [sessionRows] = await pool.query(`
            SELECT 
                s.id, s.start_time, s.end_time, s.status, s.start_amount, s.end_amount_physical, s.end_amount_system, s.difference, s.closing_note,
                u.username, u.role, u.full_name
            FROM cash_sessions s
            JOIN users u ON s.user_id = u.id
            WHERE DATE(s.start_time) BETWEEN ? AND ?
            ORDER BY s.start_time DESC
        `, [sDate, eDate]);

        // 1. Transactions (Income/Sales)
        const [txRows] = await pool.query(`
            SELECT 
                t.id, 
                t.created_at, 
                t.amount, 
                t.type, 
                t.payment_method, 
                t.description,
                t.reference_id,
                t.details_json,
                c.full_name as client_name,
                c.contract_number,
                COALESCE(u.username, 'Sistema') as collector,
                u.role as collector_role
            FROM transactions t
            LEFT JOIN clients c ON t.client_id = c.id
            LEFT JOIN users u ON t.collector_id = u.id
            WHERE t.type != 'void' 
            AND DATE(CONVERT_TZ(t.created_at, '+00:00', '-06:00')) BETWEEN ? AND ?
            ORDER BY t.created_at DESC
        `, [sDate, eDate]);

        // 2. Manual Cash Movements
        const [moveRows] = await pool.query(`
            SELECT 
                m.id, 
                m.created_at, 
                m.amount, 
                m.type, 
                'cash' as payment_method,
                m.description,
                'N/A' as reference_id,
                'Movimiento Manual' as client_name,
                '' as contract_number,
                COALESCE(u.username, 'Cajero') as collector,
                u.role as collector_role
            FROM cash_movements m
            LEFT JOIN cash_sessions s ON m.session_id = s.id
            LEFT JOIN users u ON s.user_id = u.id
            WHERE DATE(m.created_at) BETWEEN ? AND ?
            ORDER BY m.created_at DESC
        `, [sDate, eDate]);

        // Combine
        const combined = [
            ...txRows.map(r => ({ ...r, category: 'TRANSACTION' })),
            ...moveRows.map(r => ({ ...r, category: 'MOVEMENT' }))
        ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        // Grouping Logic
        // "Colectores" = role 'collector'
        // "Oficina" = role 'admin', 'office', 'cashier' (or null)

        // Since we unified into Caja Global, we calculate the sum on the combined list.
        const calcSum = (list) => {
            let sales = 0, manualIn = 0, manualOut = 0, refunds = 0;
            list.forEach(item => {
                const val = parseFloat(item.amount) || 0;
                const isCancelled = item.status === 'CANCELLED';
                
                if (item.category === 'TRANSACTION') {
                    if (!isCancelled) sales += val;
                } else if (item.type === 'IN') {
                    manualIn += val;
                } else if (item.type === 'REFUND') {
                    refunds += val;
                } else if (item.type === 'OUT') {
                    if (item.description && item.description.includes('[REEMB]')) {
                        refunds += val;
                    } else {
                        manualOut += val;
                    }
                }
            });
            return { totalSales: sales, totalManualIn: manualIn, totalManualOut: manualOut, totalRefunds: refunds, net: (sales + manualIn) - manualOut - refunds };
        };

        const grandTotal = calcSum(combined);

        res.json({
            globalBox: {
                data: combined,
                sessions: sessionRows,
                summary: grandTotal
            },
            office: {
                data: combined,
                sessions: sessionRows,
                summary: grandTotal
            },
            collectors: {
                data: [],
                sessions: [],
                summary: { totalSales: 0, totalManualIn: 0, totalManualOut: 0, totalRefunds: 0, net: 0 }
            },
            grandTotal
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Report Error' });
    } finally {
        if (pool) pool.release();
    }
};

exports.exportDailyDetailsXLS = async (req, res) => {
    let pool;
    try {
        const { startDate, endDate } = req.query;
        const sDate = startDate || getTodayManagua();
        const eDate = endDate || sDate;

        pool = await db.getConnection();

        // reuse queries - code duplication for safety/speed vs refactor
        const [txRows] = await pool.query(`
            SELECT 
                t.created_at, t.amount, t.type, t.payment_method, t.description, t.status, t.cancellation_reason,
                c.full_name as client_name, c.contract_number, c.status as client_status, c.last_paid_month, c.last_payment_date, c.installation_date, c.cutoff_date,
                COALESCE(u.username, 'Sistema') as collector,
                u.role as collector_role
            FROM transactions t
            LEFT JOIN clients c ON t.client_id = c.id
            LEFT JOIN users u ON t.collector_id = u.id
            WHERE t.type != 'void' AND DATE(CONVERT_TZ(t.created_at, '+00:00', '-06:00')) BETWEEN ? AND ?
        `, [sDate, eDate]);

        const [moveRows] = await pool.query(`
            SELECT 
                m.created_at, m.amount, m.type, 'cash' as payment_method, m.description, 'COMPLETED' as status, NULL as cancellation_reason,
                'Movimiento Manual' as client_name, '' as contract_number, 'N/A' as client_status, NULL as last_paid_month, NULL as last_payment_date, NULL as installation_date, NULL as cutoff_date,
                COALESCE(u.username, 'Cajero') as collector,
                u.role as collector_role
            FROM cash_movements m
            LEFT JOIN cash_sessions s ON m.session_id = s.id
            LEFT JOIN users u ON s.user_id = u.id
            WHERE DATE(m.created_at) BETWEEN ? AND ?
        `, [sDate, eDate]);

        const combined = [
            ...txRows.map(r => ({ ...r, category: 'TRANSACTION' })),
            ...moveRows.map(r => ({ ...r, category: 'MOVEMENT' }))
        ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        const ExcelJS = require('exceljs');
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Bit├ícora Diaria');

        sheet.columns = [
            { header: 'Fecha/Hora', key: 'time', width: 20 },
            { header: 'Caja (Origen)', key: 'box', width: 15 },
            { header: 'Tipo', key: 'type', width: 15 },
            { header: 'Cliente / Descripci├│n', key: 'desc', width: 40 },
            { header: 'Estado Cliente', key: 'client_status', width: 15 },
            { header: 'Fecha Corte', key: 'cutoff_date', width: 15 },
            { header: '├Ültimo Pago', key: 'last_payment_date', width: 15 },
            { header: 'Fecha Instalaci├│n', key: 'installation_date', width: 18 },
            { header: 'Responsable', key: 'collector', width: 15 },
            { header: 'M├®todo', key: 'method', width: 10 },
            { header: 'Monto', key: 'amount', width: 15 },
            { header: 'Estado', key: 'status', width: 15 },
            { header: 'Motivo Cancelaci├│n', key: 'reason', width: 30 },
        ];

        combined.forEach(row => {
            const isIncome = (row.type !== 'OUT' && row.type !== 'REFUND' && row.type !== 'void');
            const typeLabel = row.category === 'TRANSACTION' ? 'COBRO' 
                : row.type === 'IN' ? 'INGRESO' 
                : row.type === 'REFUND' ? 'DEVOLUCI├ôN' 
                : 'SALIDA';
            const boxLabel = 'GLOBAL';
            
            const statusMap = {
                'active': 'Activo', 'suspended': 'Cortado', 'disconnected': 'Retirado',
                'pending_install': 'Pendiente', 'disconnected_by_request': 'Desc. Solicitud',
                'promotions': 'Promociones', 'courtesy': 'Cortes├¡a', 'provider': 'Proveedor', 'office': 'Oficina'
            };

            sheet.addRow({
                time: formatDateTimeManagua(row.created_at),
                box: boxLabel,
                type: typeLabel,
                desc: (row.client_name || row.description) + (row.contract_number ? ` (#${row.contract_number})` : ''),
                client_status: statusMap[row.client_status] || row.client_status || 'N/A',
                cutoff_date: formatDateDMY(row.cutoff_date),
                last_payment_date: formatDateDMY(row.last_payment_date),
                installation_date: formatDateDMY(row.installation_date),
                collector: row.collector,
                method: row.payment_method,
                amount: (isIncome ? 1 : -1) * parseFloat(row.amount),
                status: row.status === 'CANCELLED' ? 'CANCELADO' : (row.status || 'COMPLETED'),
                reason: row.cancellation_reason || ''
            });
        });

        // Totals Row
        // Calculate
        let net = 0;
        combined.forEach(item => {
            const val = parseFloat(item.amount) || 0;
            const isCancelled = item.status === 'CANCELLED';
            if (item.category === 'TRANSACTION') {
                if (!isCancelled) net += val;
            } else if (item.type === 'IN') {
                net += val;
            } else if (item.type === 'REFUND' || item.type === 'OUT') {
                net -= val;
            }
        });

        sheet.addRow({});
        sheet.addRow({ desc: 'BALANCE NETO', amount: net });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Bitacora_${sDate}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Export Error:', error);
        res.status(500).send('Error exportando excel');
    } finally {
        if (pool) pool.release();
    }
};

// --- NEW BLOCKS FOR MOVEMENTS & SERVICE ORDERS ---

// 6. Movements (Tr├ímites) Report
// 6. Movements (Tr├ímites) Report
exports.getMovementsReport = async (req, res) => {
    let pool;
    try {
        const { startDate, endDate } = req.query;
        const sDate = startDate || getTodayManagua();
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
        const sDate = startDate || getTodayManagua();
        const eDate = endDate || sDate;
        const pool = await db.getConnection();

        // IF LIST IS REQUESTED (For ClientMovements View)
        if (list) {
            let params = [];
            let dateCondition = '';

            if (startDate && endDate) {
                if (status === 'COMPLETED') {
                    dateCondition = ` DATE(COALESCE(so.completion_date, so.created_at)) BETWEEN ? AND ? `;
                } else {
                    dateCondition = ` DATE(so.created_at) BETWEEN ? AND ? `;
                }
                params.push(sDate, eDate);
            }

            // 1. Fetch Service Orders
            let querySO = `
                SELECT so.id, so.created_at, so.type, so.status, so.technician_notes as description,
                       c.full_name as client_name, c.id as client_id,
                       c.address_street, c.contract_number, c.status as client_status
                FROM service_orders so
                LEFT JOIN clients c ON so.client_id = c.id
            `;

            let conditionsSO = [];

            if (status === 'PENDING') {
                conditionsSO.push(`so.status IN ('PENDING', 'IN_PROGRESS')`);
            } else if (status === 'COMPLETED') {
                conditionsSO.push(`so.status IN ('COMPLETED', 'FINALIZADO')`);
            }

            if (dateCondition) {
                conditionsSO.push(dateCondition);
            }

            if (conditionsSO.length > 0) {
                querySO += ` WHERE ` + conditionsSO.join(' AND ');
            }

            querySO += ` ORDER BY so.created_at DESC LIMIT 200`;

            const [rawSoRows] = await pool.query(querySO, params);

            const typeMap = {
                'INSTALLATION': 'NUEVA INSTALACIÓN',
                'RECONNECTION': 'RECONEXIÓN',
                'CUTOFF': 'CORTE MORA',
                'TRANSFER': 'TRASLADO',
                'REMOVAL': 'SOLICITUD BAJA',
                'REPAIR': 'REPARACIÓN / AVERÍA'
            };

            const soRows = rawSoRows.map(r => ({
                ...r,
                type: typeMap[r.type] || r.type
            }));

            // 2. Fetch Web Averias
            let averiaRows = [];

            let avConditions = [];
            let avParams = [];
            if (status === 'PENDING') {
                avConditions.push(`estado = 'Pendiente'`);
            } else if (status === 'COMPLETED') {
                avConditions.push(`estado IN ('Revisado', 'Atendido')`);
            } else {
                // ALL -> no status filter
            }

            if (startDate && endDate) {
                avConditions.push(`DATE(fecha_reporte) BETWEEN ? AND ?`);
                avParams.push(sDate, eDate);
            }

            let queryAv = `
                SELECT id, fecha_reporte as created_at, 'REPORTE WEB' as type, estado as status, detalles_averia as description,
                       nombre_completo as client_name, NULL as client_id,
                       zona_barrio as address_street, NULL as contract_number, 'N/A' as client_status
                FROM averias
            `;
            if (avConditions.length > 0) {
                queryAv += ` WHERE ` + avConditions.join(' AND ');
            }
            const [avRows] = await pool.query(queryAv, avParams);

            // Format Averias to match Service Order structure
            averiaRows = avRows.map(a => ({
                ...a,
                id: `WEB-${a.id}`, // Avoid ID collision in UI keys
                status: a.status === 'Revisado' ? 'FINALIZADO' : 'COMPLETED'
            }));

            // 3. Fetch Client Logs (Tr├ímites: Changes, Disconnects, etc.)
            let logRows = [];
            // Logs are inherently "completed" actions.
            // Only show them in ALL or COMPLETED
            if (status === 'ALL' || status === 'COMPLETED') {
                let logConditions = [];
                let logParams = [];

                if (startDate && endDate) {
                    logConditions.push(`DATE(l.timestamp) BETWEEN ? AND ?`);
                    logParams.push(sDate, eDate);
                }

                // Only fetch specific Tramite actions
                // Note: RECONNECT is excluded ÔÇö it's tracked as a service_order (PENDING/IN_PROGRESS)
                // including it here would confuse users seeing it as FINALIZADO when order is still pending
                logConditions.push(`l.action IN ('CHANGE_NAME', 'CHANGE_ADDRESS', 'DISCONNECT_REQ', 'DISCONNECT_MORA', 'REPAIR')`);

                let queryLog = `
                    SELECT l.id, l.timestamp as created_at, l.action, l.details,
                           c.full_name as client_name, c.id as client_id,
                           c.address_street, c.contract_number, c.status as client_status
                    FROM client_logs l
                    LEFT JOIN clients c ON l.client_id = c.id
                `;

                if (logConditions.length > 0) {
                    queryLog += ` WHERE ` + logConditions.join(' AND ');
                }
                queryLog += ` ORDER BY l.timestamp DESC LIMIT 100`;

                const [lRows] = await pool.query(queryLog, logParams);

                logRows = lRows.map(l => {
                    // Map Action to readable Type
                    let type = l.action;
                    if (type === 'CHANGE_NAME') type = 'CAMBIO DE NOMBRE';
                    if (type === 'CHANGE_ADDRESS') type = 'TRASLADO';
                    if (type === 'DISCONNECT_REQ') type = 'SOLICITUD BAJA';
                    if (type === 'DISCONNECT_MORA') type = 'CORTE MORA';
                    if (type === 'RECONNECT') type = 'RECONEXI├ôN';
                    if (type === 'REPAIR') type = 'REPORTE AVER├ìA';

                    return {
                        id: `LOG-${l.id}`,
                        created_at: l.created_at,
                        type: type,
                        status: 'FINALIZADO',
                        description: typeof l.details === 'string' ? l.details : JSON.stringify(l.details),
                        client_name: l.client_name,
                        client_id: l.client_id,
                        address_street: l.address_street,
                        contract_number: l.contract_number,
                        client_status: l.client_status
                    };
                }).filter(Boolean); // Remove nulls
            }        // 4. Fetch Web Contacts
            let contactRows = [];

            let contactConditions = [];
            let contactParams = [];

            if (status === 'PENDING') {
                contactConditions.push(`c.atendido = 0`);
            } else if (status === 'COMPLETED') {
                contactConditions.push(`c.atendido = 1`);
            }

            if (startDate && endDate) {
                contactConditions.push(`DATE(c.fecha_contacto) BETWEEN ? AND ?`);
                contactParams.push(sDate, eDate);
            }

            let queryContact = `
                SELECT c.id, c.fecha_contacto as created_at, c.mensaje, c.nombre_completo, c.barrio_direccion, c.atendido,
                       u.username as assigned_user
                FROM contactos c
                LEFT JOIN users u ON c.assigned_user_id = u.id
            `;

            if (contactConditions.length > 0) {
                queryContact += ` WHERE ` + contactConditions.join(' AND ');
            }
            queryContact += ` ORDER BY c.fecha_contacto DESC LIMIT 100`;

            const [cRows] = await pool.query(queryContact, contactParams);

            contactRows = cRows.map(c => ({
                id: `CONT-${c.id}`,
                created_at: c.created_at,
                type: 'CONTACTO WEB',
                status: c.atendido === 1 ? 'ATENDIDO' : 'PENDIENTE',
                description: c.mensaje + (c.assigned_user ? ` (Atendido por: ${c.assigned_user})` : ''),
                client_name: c.nombre_completo,
                client_id: null,
                address_street: c.barrio_direccion,
                contract_number: null,
                client_status: 'N/A'
            }));

            // 5. Combine and Sort
            const combined = [...soRows, ...averiaRows, ...logRows, ...contactRows].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            pool.release();
            return res.json(combined);
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

exports.exportServiceOrdersXLS = async (req, res) => {
    try {
        const { startDate, endDate, status, type } = req.query;
        const sDate = startDate || getTodayManagua();
        const eDate = endDate || sDate;

        const db = require('../config/db');
        const pool = await db.getConnection();

        let query = `
            SELECT so.id, so.created_at, so.type, so.status, so.technician_notes as description,
                   c.full_name as client_name, c.contract_number, c.address_street,
                   c.phone_primary, n.name as neighborhood_name, z.name as zone_name,
                   u.full_name as technician_name,
                   COALESCE(u_creator.full_name, u_creator.username, 'Sistema') as creator_name,
                   c.status as client_status, c.last_paid_month, c.last_payment_date, c.installation_date, c.cutoff_date
            FROM service_orders so
            LEFT JOIN clients c ON so.client_id = c.id
            LEFT JOIN neighborhoods n ON c.neighborhood_id = n.id
            LEFT JOIN zones z ON c.zone_id = z.id
            LEFT JOIN users u ON so.assigned_tech_id = u.id
            LEFT JOIN users u_creator ON so.created_by_user_id = u_creator.id
        `;
        let conditions = [];
        let params = [];

        if (status === 'PENDING') {
            conditions.push(`so.status IN ('PENDING', 'IN_PROGRESS')`);
        } else if (status === 'COMPLETED') {
            conditions.push(`so.status IN ('COMPLETED', 'FINALIZADO')`);
            conditions.push(`DATE(COALESCE(so.completion_date, so.created_at)) BETWEEN ? AND ?`);
            params.push(sDate, eDate);
        } else {
            conditions.push(`DATE(so.created_at) BETWEEN ? AND ?`);
            params.push(sDate, eDate);
        }

        if (type) {
            conditions.push(`so.type = ?`);
            params.push(type);
        }

        query += ` WHERE ` + conditions.join(' AND ');
        query += ` ORDER BY so.created_at DESC`;

        const [rows] = await pool.query(query, params);
        pool.release();

        const ExcelJS = require('exceljs');
        const workbook = new ExcelJS.Workbook();
        const sheetName = type ? type : 'Trámites';
        const worksheet = workbook.addWorksheet(sheetName);

        worksheet.columns = [
            { header: 'ID', key: 'id', width: 10 },
            { header: 'Fecha', key: 'created_at', width: 20 },
            { header: 'Tipo', key: 'type', width: 20 },
            { header: 'Creado Por', key: 'creator_name', width: 20 },
            { header: 'Cliente', key: 'client_name', width: 30 },
            { header: 'Contrato', key: 'contract_number', width: 15 },
            { header: 'Estado Cliente', key: 'client_status', width: 15 },
            { header: 'Teléfono', key: 'phone_primary', width: 15 },
            { header: 'Dirección', key: 'address_street', width: 30 },
            { header: 'Barrio', key: 'neighborhood_name', width: 20 },
            { header: 'Zona', key: 'zone_name', width: 15 },
            { header: 'Técnico', key: 'technician_name', width: 20 },
            { header: 'Estado Orden', key: 'status', width: 15 },
            { header: 'Fecha Corte', key: 'cutoff_date', width: 15 },
            { header: 'Último Pago', key: 'last_payment_date', width: 15 },
            { header: 'Fecha Instalación', key: 'installation_date', width: 18 },
            { header: 'Detalles / Notas', key: 'description', width: 40 }
        ];

        worksheet.getRow(1).font = { bold: true };

        const statusMap = {
            'active': 'Activo', 'suspended': 'Cortado', 'disconnected': 'Retirado',
            'pending_install': 'Pendiente', 'disconnected_by_request': 'Desc. Solicitud',
            'promotions': 'Promociones', 'courtesy': 'Cortesía', 'provider': 'Proveedor', 'office': 'Oficina'
        };

        const orderStatusMap = {
            'PENDING': 'PENDIENTE',
            'IN_PROGRESS': 'EN PROCESO',
            'COMPLETED': 'FINALIZADO',
            'FINALIZADO': 'FINALIZADO',
            'CANCELLED': 'CANCELADO'
        };

        const typeMap = {
            'INSTALLATION': 'NUEVA INSTALACIÓN',
            'RECONNECTION': 'RECONEXIÓN',
            'CUTOFF': 'CORTE MORA',
            'TRANSFER': 'TRASLADO',
            'REMOVAL': 'SOLICITUD BAJA',
            'REPAIR': 'REPARACIÓN / AVERÍA'
        };

        rows.forEach(r => {
            worksheet.addRow({
                ...r,
                type: typeMap[r.type] || r.type,
                status: orderStatusMap[r.status] || r.status,
                client_status: statusMap[r.client_status] || r.client_status || 'N/A',
                neighborhood_name: r.neighborhood_name || '',
                zone_name: r.zone_name || '',
                technician_name: r.technician_name || '',
                phone_primary: r.phone_primary || '',
                cutoff_date: formatDateDMY(r.cutoff_date),
                last_payment_date: formatDateDMY(r.last_payment_date),
                installation_date: formatDateDMY(r.installation_date),
                created_at: formatDateTimeManagua(r.created_at)
            });
        });

        const fileName = type ? `${type}_${sDate}` : `Tramites_${sDate}`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}.xlsx"`);

        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {
        console.error(err);
        res.status(500).send('Error exportando excel');
    }
};
exports.exportCollectorPerformanceXLS = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const sDate = startDate || getTodayManagua();
        const eDate = endDate || sDate;

        const pool = await db.getConnection();
        const [rows] = await pool.query(`
            SELECT 
                u.username,
                u.full_name,
                COUNT(t.id) as total_recibos,
                SUM(t.amount) as total_cobrado,
                AVG(t.amount) as promedio_recibo,
                MAX(t.created_at) as ultimo_cobro
            FROM users u
            JOIN transactions t ON u.id = t.collector_id
            WHERE t.type != 'void'
            AND DATE(CONVERT_TZ(t.created_at, '+00:00', '-06:00')) BETWEEN ? AND ?
            GROUP BY u.id, u.username, u.full_name
            ORDER BY total_cobrado DESC
        `, [sDate, eDate]);
        pool.release();

        const ExcelJS = require('exceljs');
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Rendimiento Cobradores');

        worksheet.columns = [
            { header: 'Usuario', key: 'username', width: 15 },
            { header: 'Nombre Completo', key: 'full_name', width: 30 },
            { header: 'Cant. Recibos', key: 'total_recibos', width: 15 },
            { header: 'Total Cobrado', key: 'total_cobrado', width: 20 },
            { header: 'Promedio', key: 'promedio_recibo', width: 15 },
            { header: '├Ültimo Cobro', key: 'ultimo_cobro', width: 25 },
        ];

        worksheet.getRow(1).font = { bold: true };

        rows.forEach(r => {
            worksheet.addRow({
                ...r,
                ultimo_cobro: r.ultimo_cobro ? new Date(r.ultimo_cobro).toLocaleString() : 'N/A'
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="Cierre_Cobradores_${sDate}.xlsx"`);

        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error(err);
        res.status(500).send('Error exportando excel');
    }
};

// =====================================================================
// FACTURAS POR COBRADOR - Busqueda avanzada con filtros y paginacion
// =====================================================================
exports.getInvoicesByCollector = async (req, res) => {
    let conn;
    try {
        const {
            collectorId,
            startDate,
            endDate,
            invoiceNumber,
            clientSearch,
            page = 1,
            limit = 25
        } = req.query;

        conn = await db.getConnection();

        const conditions = ["t.type != 'void'"];
        const params = [];

        if (collectorId && collectorId !== '') {
            conditions.push('t.collector_id = ?');
            params.push(collectorId);
        }
        if (startDate && startDate !== '') {
            conditions.push("DATE(CONVERT_TZ(t.created_at, '+00:00', '-06:00')) >= ?");
            params.push(startDate);
        }
        if (endDate && endDate !== '') {
            conditions.push("DATE(CONVERT_TZ(t.created_at, '+00:00', '-06:00')) <= ?");
            params.push(endDate);
        }
        if (invoiceNumber && invoiceNumber !== '') {
            conditions.push('t.reference_id LIKE ?');
            params.push('%' + invoiceNumber + '%');
        }
        if (clientSearch && clientSearch !== '') {
            conditions.push('(c.full_name LIKE ? OR c.contract_number LIKE ?)');
            params.push('%' + clientSearch + '%', '%' + clientSearch + '%');
        }

        const whereClause = 'WHERE ' + conditions.join(' AND ');
        const pageNum  = Math.max(1, parseInt(page) || 1);
        const pageSize = Math.min(100, Math.max(10, parseInt(limit) || 25));
        const offset   = (pageNum - 1) * pageSize;

        const dataQuery = `
            SELECT
                t.id,
                COALESCE(NULLIF(TRIM(t.reference_id), ''), CONCAT('#', t.id)) AS numero_factura,
                t.created_at AS fecha,
                t.amount AS monto,
                t.payment_method AS metodo_pago,
                t.status AS estado,
                t.type AS tipo,
                t.description AS descripcion,
                t.cancellation_reason,
                COALESCE(c.full_name, '—') AS cliente,
                COALESCE(c.contract_number, '—') AS contrato,
                COALESCE(u.full_name, 'Sin Asignar') AS cobrador,
                COALESCE(u.username, 'sistema') AS usuario_cobrador,
                u.id AS cobrador_id,
                u.role AS cobrador_rol
            FROM transactions t
            LEFT JOIN clients c ON t.client_id = c.id
            LEFT JOIN users u ON t.collector_id = u.id
            ${whereClause}
            ORDER BY t.created_at DESC
            LIMIT ? OFFSET ?
        `;

        const countQuery = `
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN t.status != 'CANCELLED' THEN t.amount ELSE 0 END) AS total_monto,
                SUM(CASE WHEN t.status = 'CANCELLED' THEN 1 ELSE 0 END) AS total_canceladas,
                SUM(CASE WHEN t.status = 'CANCELLED' THEN t.amount ELSE 0 END) AS monto_cancelado
            FROM transactions t
            LEFT JOIN clients c ON t.client_id = c.id
            LEFT JOIN users u ON t.collector_id = u.id
            ${whereClause}
        `;

        const [rows]     = await conn.query(dataQuery, [...params, pageSize, offset]);
        const [countRes] = await conn.query(countQuery, params);

        const totalRows      = countRes[0].total || 0;
        const totalMonto     = parseFloat(countRes[0].total_monto || 0);
        const totalCanceladas = parseInt(countRes[0].total_canceladas || 0);
        const montoCancelado = parseFloat(countRes[0].monto_cancelado || 0);

        res.json({
            data: rows,
            pagination: {
                total: totalRows,
                page: pageNum,
                limit: pageSize,
                totalPages: Math.ceil(totalRows / pageSize)
            },
            summary: { totalMonto, totalCanceladas, montoCancelado, totalFacturas: totalRows }
        });

    } catch (err) {
        console.error('InvoicesByCollector Error:', err);
        res.status(500).json({ error: 'Error al consultar facturas' });
    } finally {
        if (conn) conn.release();
    }
};
