const db = require('../config/db');

// Helper to get a valid user ID (fallback to first user if no auth)
async function getValidUser(reqUserId) {
    if (reqUserId) return reqUserId;
    const [rows] = await db.query("SELECT id FROM users ORDER BY id ASC LIMIT 1");
    return rows.length > 0 ? rows[0].id : 1;
}

// Check if user has open session
exports.getStatus = async (req, res) => {
    try {
        const userId = await getValidUser(req.user?.id);
        const [rows] = await db.query(
            'SELECT * FROM cash_sessions WHERE user_id = ? AND status = "open" ORDER BY start_time DESC LIMIT 1',
            [userId]
        );
        res.json(rows.length > 0 ? rows[0] : null);
    } catch (err) { res.status(500).send(err.message); }
};

// Get Live Statistics for Dashboard
exports.getSessionStats = async (req, res) => {
    const userId = 1;
    try {
        const [sessions] = await db.query('SELECT id, start_amount FROM cash_sessions WHERE user_id = ? AND status = "open"', [userId]);
        if (!sessions.length) return res.json(null);

        const sessionId = sessions[0].id;
        const startAmount = parseFloat(sessions[0].start_amount);

        // 1. Sales Breakdown
        const [payments] = await db.query(`
            SELECT payment_method, SUM(amount) as total, COUNT(*) as count 
            FROM transactions 
            WHERE session_id = ? 
            GROUP BY payment_method
        `, [sessionId]);

        // Map to easier object
        const stats = {
            sales_cash: 0,
            sales_card: 0,
            sales_transfer: 0,
            sales_dollars: 0,
            tx_count: 0
        };

        payments.forEach(p => {
            if (p.payment_method === 'cash') stats.sales_cash = parseFloat(p.total);
            else if (p.payment_method === 'card') stats.sales_card = parseFloat(p.total);
            else if (p.payment_method === 'transfer') stats.sales_transfer = parseFloat(p.total);
            else if (p.payment_method === 'dollars') stats.sales_dollars = parseFloat(p.total);

            stats.tx_count += p.count;
        });

        // 2. Cash Movements
        const [moves] = await db.query(`
            SELECT type, SUM(amount) as total FROM cash_movements WHERE session_id = ? GROUP BY type
        `, [sessionId]);

        let manualIn = 0, manualOut = 0;
        moves.forEach(m => {
            if (m.type === 'IN') manualIn = parseFloat(m.total);
            else manualOut = parseFloat(m.total);
        });

        // 3. Totals
        // "Cash in Drawer" = Start + Sales(Cash) + ManualIn - ManualOut
        // Note: Dollars might be kept separate or converted. Assuming separate drawer for this MVP or mixed.
        // Let's assume strict Cordobas drawer for now, or total value.

        const cashInDrawer = startAmount + stats.sales_cash + manualIn - manualOut;

        res.json({
            ...stats,
            manual_in: manualIn,
            manual_out: manualOut,
            start_amount: startAmount,
            cash_in_drawer: cashInDrawer
        });

    } catch (err) { res.status(500).send(err); }
};

// Open Session
exports.openSession = async (req, res) => {
    console.log("Opening Session Body:", req.body);
    const { start_amount, exchange_rate } = req.body;

    try {
        const userId = await getValidUser(req.user?.id);

        // Check existing
        const [existing] = await db.query('SELECT * FROM cash_sessions WHERE user_id = ? AND status = "open"', [userId]);
        if (existing.length > 0) return res.status(400).json({ msg: 'Ya tienes una caja abierta.' });

        await db.query(
            'INSERT INTO cash_sessions (user_id, start_amount, exchange_rate, start_time) VALUES (?, ?, ?, NOW())',
            [userId, start_amount, exchange_rate || 37.00]
        );
        res.json({ msg: 'Caja abierta correctamente' });
    } catch (err) {
        console.error("Open Session Error:", err);
        res.status(500).send('Server Error: ' + err.message);
    }
};

// Add Manual Movement (Ingreso/Egreso)
exports.addMovement = async (req, res) => {
    const { type, amount, description } = req.body;
    const userId = 1;

    try {
        const [sessions] = await db.query('SELECT id FROM cash_sessions WHERE user_id = ? AND status = "open"', [userId]);
        if (sessions.length === 0) return res.status(400).json({ msg: 'No hay caja abierta.' });

        await db.query(
            'INSERT INTO cash_movements (session_id, type, amount, description) VALUES (?, ?, ?, ?)',
            [sessions[0].id, type, amount, description]
        );
        res.json({ msg: 'Movimiento registrado' });
    } catch (err) { res.status(500).send(err); }
};

// Close Session & Get Report (STRICT MODE)
exports.closeSession = async (req, res) => {
    const { session_id, end_amount_physical, closing_note, current_user_id } = req.body;
    const reqUserId = current_user_id || 1; // Default to 1 if not sent

    try {
        // 1. Calculate System Total & Verify Ownership
        const [session] = await db.query('SELECT start_amount, user_id FROM cash_sessions WHERE id = ?', [session_id]);
        if (!session.length) return res.status(404).json({ msg: 'Sesión no encontrada' });

        const sessionOwner = session[0].user_id;

        // Fetch Requesting User Role
        const [users] = await db.query('SELECT role FROM users WHERE id = ?', [reqUserId]);
        const userRole = users.length ? users[0].role : 'cashier';

        // SECURITY CHECK: Only Owner or Admin can close
        if (sessionOwner !== reqUserId && userRole !== 'admin') {
            return res.status(403).json({ msg: 'No tienes permiso para cerrar esta caja. Solo el Cajero responsable o un Administrador pueden hacerlo.' });
        }

        const [income] = await db.query(
            'SELECT SUM(amount) as total FROM transactions WHERE session_id = ? AND type != "void"',
            [session_id]
        );

        const [movements] = await db.query(
            'SELECT type, SUM(amount) as total FROM cash_movements WHERE session_id = ? GROUP BY type',
            [session_id]
        );

        let manualIn = 0;
        let manualOut = 0;
        movements.forEach(m => {
            if (m.type === 'IN') manualIn = Number(m.total);
            if (m.type === 'OUT') manualOut = Number(m.total);
        });

        const startAmount = Number(session[0].start_amount);
        const salesTotal = Number(income[0].total || 0); // Only Cash transactions typically? Assuming all transactions are cash for now or filtering by payment 'cash' might be needed if cards accepted.
        // Actually, system total should strictly be CASH ON HAND.
        // Let's refine valid Income to only payment_method='cash' or 'dollars' converted.
        // For simplicity, assuming 'transactions' query above needs refinement if user mixes payments.
        // Let's stick to total for now, but really should filter by 'cash'.

        // RE-QUERY accurate cash total
        const [cashIncome] = await db.query(
            'SELECT SUM(amount) as total FROM transactions WHERE session_id = ? AND (payment_method = "cash" OR payment_method = "dollars")',
            [session_id]
        );
        const cashSales = Number(cashIncome[0].total || 0);

        const systemTotal = startAmount + cashSales + manualIn - manualOut;
        const difference = Number(end_amount_physical) - systemTotal;

        // 2. Strict Check
        if (Math.abs(difference) > 0.5 && !closing_note) {
            return res.status(400).json({
                error: 'JUSTIFICATION_REQUIRED',
                msg: `Diferencia detectada de ${difference.toFixed(2)}. Debe agregar una NOTA DE JUSTIFICACIÓN.`,
                systemTotal,
                difference
            });
        }

        // 3. NEW: Save to Historical Report (cash_reports)
        // Get Client Count
        const [clients] = await db.query('SELECT COUNT(DISTINCT client_id) as count FROM transactions WHERE session_id = ? AND type != "void"', [session_id]);
        const clientCount = clients[0].count || 0;

        // Get Breakdown (JSON)
        const [methodStats] = await db.query('SELECT payment_method, SUM(amount) as total FROM transactions WHERE session_id = ? AND type != "void" GROUP BY payment_method', [session_id]);

        await db.query(
            'INSERT INTO cash_reports (user_id, total_cash, client_count, breakdown_json) VALUES (?, ?, ?, ?)',
            [reqUserId, systemTotal, clientCount, JSON.stringify(methodStats)]
        );

        await db.query(
            `UPDATE cash_sessions SET 
             end_time = NOW(), 
             status = "closed", 
             end_amount_system = ?, 
             end_amount_physical = ?, 
             difference = ?,
             closing_note = ?
             WHERE id = ?`,
            [systemTotal, end_amount_physical, difference || 0, closing_note || null, session_id]
        );

        res.json({ msg: 'Caja Cerrada Correctamente' });
    } catch (err) { res.status(500).send(err); }
};
