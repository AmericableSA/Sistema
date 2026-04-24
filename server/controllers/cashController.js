const db = require('../config/db');

// Helper to get a valid user ID (fallback to first user if no auth)
async function getValidUser(reqUserId) {
    if (reqUserId) return reqUserId;
    const [rows] = await db.query("SELECT id FROM users ORDER BY id ASC LIMIT 1");
    return rows.length > 0 ? rows[0].id : 1;
}

// Check if CURRENT USER or ANYONE has open session of a specific type
exports.getStatus = async (req, res) => {
    try {
        const { type } = req.query; // Capture type from query
        const sessionType = type || 'OFICINA';

        // Check for ANY globally open session of this type
        const [rows] = await db.query(
            'SELECT s.*, u.username as opener_name FROM cash_sessions s JOIN users u ON s.user_id = u.id WHERE s.session_type = ? AND s.status = ? ORDER BY s.start_time DESC LIMIT 1',
            [sessionType, 'open']
        );
        res.json(rows.length > 0 ? rows[0] : null);
    } catch (err) { res.status(500).send(err.message); }
};

// Get Live Statistics by Type
exports.getSessionStats = async (req, res) => {
    const { type } = req.query;
    const sessionType = type || 'OFICINA';

    try {
        // Find globally open session of this type
        const [sessions] = await db.query('SELECT * FROM cash_sessions WHERE session_type = ? AND status = ?', [sessionType, 'open']);
        if (!sessions.length) return res.json(null);

        const sessionId = sessions[0].id;
        const startAmount = parseFloat(sessions[0].start_amount);

        // 1. Sales Breakdown (linked to THIS session)
        const [payments] = await db.query(`
            SELECT payment_method, SUM(amount) as total, COUNT(*) as count 
            FROM transactions 
            WHERE session_id = ? AND (status = 'SUCCESS' OR status = 'COMPLETED') AND type != 'void'
            GROUP BY payment_method
        `, [sessionId]);

        const stats = { sales_cash: 0, sales_card: 0, sales_transfer: 0, sales_dollars: 0, tx_count: 0 };

        payments.forEach(p => {
            if (p.payment_method === 'cash') stats.sales_cash = parseFloat(p.total);
            else if (p.payment_method === 'card') stats.sales_card = parseFloat(p.total);
            else if (p.payment_method === 'transfer') stats.sales_transfer = parseFloat(p.total);
            else if (p.payment_method === 'dollars') stats.sales_dollars = parseFloat(p.total);
            stats.tx_count += p.count;
        });

        // 2. Cash Movements (Detect Refunds)
        const [moves] = await db.query(`
            SELECT type, amount, description FROM cash_movements WHERE session_id = ?
        `, [sessionId]);

        let manualIn = 0, manualOut = 0, refunds = 0;
        moves.forEach(m => {
            if (m.type === 'IN') {
                manualIn += parseFloat(m.amount);
            } else if (m.type === 'REFUND') {
                refunds += parseFloat(m.amount);
            } else if (m.type === 'OUT') {
                if (m.description && m.description.includes('[REEMB]')) {
                    refunds += parseFloat(m.amount);
                } else {
                    manualOut += parseFloat(m.amount);
                }
            }
        });

        const currentRate = parseFloat(sessions[0].exchange_rate || 37);
        const dollarsInCordobas = stats.sales_dollars * currentRate;
        // Refunds are a reversal of income, so they subtract from the expected cash
        const cashInDrawer = startAmount + stats.sales_cash + dollarsInCordobas + manualIn - manualOut - refunds;

        res.json({
            ...stats,
            manual_in: manualIn,
            manual_out: manualOut,
            refunds: refunds,
            start_amount: startAmount,
            cash_in_drawer: cashInDrawer,
            session_id: sessionId
        });

    } catch (err) { res.status(500).send(err); }
};

// Open Session (Global per Type)
exports.openSession = async (req, res) => {
    const { start_amount, exchange_rate, type, current_user_id } = req.body;
    const sessionType = type || 'OFICINA';

    try {
        const userId = await getValidUser(current_user_id || req.user?.id);

        // Check if ANYONE has this box type open
        const [existing] = await db.query('SELECT * FROM cash_sessions WHERE session_type = ? AND status = ?', [sessionType, 'open']);
        if (existing.length > 0) return res.status(400).json({ msg: `Ya existe una sesión global abierta para ${sessionType}.` });

        await db.query(
            'INSERT INTO cash_sessions (user_id, start_amount, exchange_rate, start_time, session_type, status) VALUES (?, ?, ?, NOW(), ?, "open")',
            [userId, start_amount, exchange_rate || 37.00, sessionType]
        );
        res.json({ msg: `Caja ${sessionType} abierta correctamente` });
    } catch (err) {
        console.error("Open Session Error:", err);
        res.status(500).send('Server Error: ' + err.message);
    }
};

// Add Manual Movement (Type Aware)
exports.addMovement = async (req, res) => {
    const { type, amount, description, session_type, current_user_id } = req.body;
    const targetType = session_type || 'OFICINA';
    const userId = await getValidUser(current_user_id || req.user?.id);

    try {
        // Find global session of specific type
        const [sessions] = await db.query('SELECT id FROM cash_sessions WHERE session_type = ? AND status = ?', [targetType, 'open']);
        if (sessions.length === 0) return res.status(400).json({ msg: `No hay ninguna caja ${targetType} abierta.` });

        const [actors] = await db.query('SELECT username FROM users WHERE id = ?', [userId]);
        const actorName = actors[0]?.username || 'Usuario';
        const finalDesc = `${description} (Por: ${actorName})`;

        await db.query(
            'INSERT INTO cash_movements (session_id, type, amount, description) VALUES (?, ?, ?, ?)',
            [sessions[0].id, type, amount, finalDesc]
        );
        res.json({ msg: 'Movimiento registrado' });
    } catch (err) { res.status(500).send(err); }
};

// Close Session (Global)
exports.closeSession = async (req, res) => {
    const { session_id, end_amount_physical, closing_note, current_user_id } = req.body;
    const closerId = await getValidUser(current_user_id || req.user?.id);

    if (end_amount_physical === undefined || isNaN(end_amount_physical)) {
        return res.status(400).json({ msg: 'El monto físico final es requerido y debe ser un número.' });
    }

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Get Session with Lock to prevent double closure or concurrent modifications
        const [sessionRows] = await connection.query('SELECT * FROM cash_sessions WHERE id = ? FOR UPDATE', [session_id]);
        if (sessionRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ msg: 'Sesión no encontrada' });
        }
        const session = sessionRows[0];

        if (session.status === 'closed') {
            await connection.rollback();
            return res.status(400).json({ msg: 'Esta sesión ya ha sido cerrada previamente.' });
        }

        // 2. Calculate Sales Income (Cash and Dollars) - Only SUCCESSFUL
        const [income] = await connection.query(
            'SELECT payment_method, SUM(amount) as total FROM transactions WHERE session_id = ? AND (status = "SUCCESS" OR status = "COMPLETED") AND type != "void" GROUP BY payment_method',
            [session_id]
        );

        let cashSales = 0, dollarSales = 0;
        income.forEach(i => {
            if (i.payment_method === 'cash') cashSales = Number(i.total);
            if (i.payment_method === 'dollars') dollarSales = Number(i.total);
        });

        // 3. Calculate Manual Movements (Detailed)
        const [movements] = await connection.query(
            'SELECT type, amount, description FROM cash_movements WHERE session_id = ?',
            [session_id]
        );

        let manualIn = 0, manualOut = 0, refunds = 0;
        movements.forEach(m => {
            if (m.type === 'IN') {
                manualIn += Number(m.amount);
            } else if (m.type === 'REFUND') {
                refunds += Number(m.amount);
            } else if (m.type === 'OUT') {
                if (m.description && m.description.includes('[REEMB]')) {
                    refunds += Number(m.amount);
                } else {
                    manualOut += Number(m.amount);
                }
            }
        });

        const startAmount = Number(session.start_amount);
        const sessionRate = parseFloat(session.exchange_rate || 37);
        const dollarValueInCordobas = dollarSales * sessionRate;

        // 4. Final Totals
        // Balance = Start + Sales + Manual In - Manual Out - Refunds
        const systemTotal = startAmount + cashSales + dollarValueInCordobas + manualIn - manualOut - refunds;
        const difference = Number(end_amount_physical) - systemTotal;

        // 5. Justification check
        if (Math.abs(difference) > 0.99 && !closing_note) {
            await connection.rollback();
            return res.status(400).json({
                error: 'JUSTIFICATION_REQUIRED',
                msg: `Diferencia detectada de ${difference.toFixed(2)}. Debe agregar una NOTA DE JUSTIFICACIÓN para cerrar con este descuadre.`,
                systemTotal,
                difference
            });
        }

        // 6. Update Session (Close it)
        await connection.query(
            `UPDATE cash_sessions SET 
             end_time = NOW(), 
             status = "closed", 
             end_amount_system = ?, 
             end_amount_physical = ?, 
             difference = ?,
             closing_note = ?,
             closed_by_user_id = ?
             WHERE id = ?`,
            [systemTotal, end_amount_physical, difference, closing_note || null, closerId, session_id]
        );

        await connection.commit();
        res.json({ 
            msg: 'Caja Cerrada Correctamente', 
            stats: { systemTotal, end_amount_physical, difference } 
        });

    } catch (err) {
        await connection.rollback();
        console.error("Close Session Error:", err);
        res.status(500).json({ msg: 'Error crítico al cerrar caja: ' + err.message });
    } finally {
        connection.release();
    }
};
