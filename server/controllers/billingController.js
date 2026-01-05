const db = require('../config/db');

// Helper to get a valid user ID (fallback to first user if no auth)
async function getValidUser(reqUserId) {
    if (reqUserId) return reqUserId;
    const [rows] = await db.query("SELECT id FROM users ORDER BY id ASC LIMIT 1");
    // Return found ID or strict 1 if DB is empty (which shouldn't happen)
    return rows.length > 0 ? rows[0].id : 1;
}

// --- HELPER: Calculate Months Difference ---
const getMonthDiff = (d1, d2) => {
    let months;
    months = (d2.getFullYear() - d1.getFullYear()) * 12;
    months -= d1.getMonth();
    months += d2.getMonth();
    return months <= 0 ? 0 : months;
};

// 1. Get Client Billing Status (Arrears & Total)
exports.getBillingDetails = async (req, res) => {
    const { clientId } = req.params;
    try {
        const [rows] = await db.query(`
            SELECT c.*, z.tariff as zone_tariff 
            FROM clients c 
            LEFT JOIN zones z ON c.zone_id = z.id 
            WHERE c.id = ?
        `, [clientId]);
        if (!rows.length) return res.status(404).json({ msg: 'Cliente no encontrado' });

        const client = rows[0];
        const [settings] = await db.query('SELECT * FROM system_settings');
        const settingsMap = settings.reduce((acc, row) => ({ ...acc, [row.setting_key]: row.setting_value }), {});

        const moraFee = parseFloat(settingsMap['mora_fee'] || 50);

        // OLD: Global Cutoff
        // const cutoffDay = parseInt(settingsMap['cutoff_day'] || 15);

        // NEW: Individual Cutoff based on "Mes Pagado" (Vencimiento)
        // User requested: "fije en su fecha ultimo pago" -> We use last_paid_month which tracks coverage/due date.
        // If last_paid_month is '2025-11-18', the cutoff is 18.
        const cycleDate = new Date(client.last_paid_month || client.created_at || new Date());
        const cutoffDay = cycleDate.getDate();

        // Calculate Months Owed
        const lastPaid = new Date(client.last_paid_month); // e.g. 2024-12-01

        // Normalize Last Paid to start of month to avoid day shifts
        const lastPaidNorm = new Date(lastPaid.getFullYear(), lastPaid.getMonth(), 1);

        const today = new Date();
        const todayNorm = new Date(today.getFullYear(), today.getMonth(), 1);

        // Months diff interaction:
        let monthsOwedCount = (todayNorm.getFullYear() - lastPaidNorm.getFullYear()) * 12 + (todayNorm.getMonth() - lastPaidNorm.getMonth());

        // Mora Logic
        // Rule: Mora applies if you are PAST the cutoff day of the current owing month.
        // If monthsOwed = 1 (Means I owe Current Month). 
        //   If todayDay > cutoffDay -> Mora = YES.
        // If monthsOwed > 1 (Means I owe Current + Previous).
        //   Mora = YES (Definitely).
        // If monthsOwed = 0 (Paid up). -> Mora = NO.

        let hasMora = false;
        if (monthsOwedCount > 1) {
            hasMora = true;
        } else if (monthsOwedCount === 1) {
            if (today.getDate() > cutoffDay) {
                hasMora = true;
            }
        }

        // If client already has mora stored
        const currentMoraBalance = parseFloat(client.mora_balance);

        // Prepare list of owed months names
        const owedMonths = [];
        let nextMonth = new Date(lastPaidNorm);
        for (let i = 0; i < monthsOwedCount; i++) {
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            owedMonths.push(nextMonth.toLocaleString('es-ES', { month: 'long', year: 'numeric' }));
        }

        res.json({
            client,
            months_owed: monthsOwedCount,
            owed_months_list: owedMonths,
            mora_amount: currentMoraBalance > 0 ? currentMoraBalance : (hasMora ? moraFee : 0),
            has_mora: hasMora || currentMoraBalance > 0,
            simulated_total: (monthsOwedCount * 12) + (hasMora ? moraFee : 0),
            client_cutoff_day: cutoffDay // Info for frontend
        });

    } catch (err) { res.status(500).send(err); }
};

// 2. Transact (Unified)
exports.createTransaction = async (req, res) => {
    const {
        client_id, type, amount, payment_method, description,
        items, service_plan_id, justification, reference_id, // EXPLICIT DESTRUCTURE
        details_json, collector_id, current_user_id
    } = req.body;
    console.log("Create Transaction Body:", req.body);
    console.log("Using Reference ID:", reference_id);

    const reqUserId = await getValidUser(current_user_id);
    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        // 1. Determine Correct Cash Session
        // PRIORITY 1: Check if the current user has their OWN session open
        let [sessions] = await conn.query(
            'SELECT id, exchange_rate, user_id FROM cash_sessions WHERE user_id = ? AND status = "open" LIMIT 1',
            [reqUserId]
        );

        // PRIORITY 2: Fallback to ANY open session (Shared Drawer Model)
        // If the current user (e.g., employee) doesn't have a box, use the Admin's box (or whoever opened one).
        if (sessions.length === 0) {
            [sessions] = await conn.query('SELECT id, exchange_rate, user_id FROM cash_sessions WHERE status = "open" ORDER BY id DESC LIMIT 1');
        }

        if (sessions.length === 0) {
            await conn.rollback();
            return res.status(403).json({ msg: 'No hay ninguna caja abierta. Pide a un administrador que abra caja.' });
        }

        const session = sessions[0];
        const sessionId = session.id;
        const currentRate = session.exchange_rate;

        // REMOVED: Ownership restriction. 
        // We now explicitly allow users to sell into sessions they don't own (Shared Drawer).

        const [trxRes] = await conn.query(
            `INSERT INTO transactions 
            (session_id, client_id, amount, type, payment_method, description, justification, service_plan_id, reference_id, exchange_rate, details_json, collector_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [sessionId, client_id || null, amount, type, payment_method, description, justification, service_plan_id, reference_id || null, currentRate, JSON.stringify({ ...details_json, items }), collector_id || null]
        );
        const transactionId = trxRes.insertId;

        // Inventory Logic (Enhanced for Bundles)
        if (items && items.length > 0) {
            for (const item of items) {
                // 1. Check Product Type
                const [pRows] = await conn.query('SELECT id, type, current_stock, name FROM products WHERE id = ?', [item.product_id]);
                if (!pRows.length) throw new Error(`Producto ID ${item.product_id} no encontrado.`);
                const product = pRows[0];

                let itemsToDeduct = [];

                if (product.type === 'bundle') {
                    // Fetch Ingredients
                    const [bItems] = await conn.query('SELECT product_id, quantity FROM bundle_items WHERE bundle_id = ?', [item.product_id]);
                    if (!bItems.length) throw new Error(`El combo ${product.name} está vacío.`);

                    // Multiply: BundleQty (Sold) * IngredientQty (Recipe)
                    itemsToDeduct = bItems.map(bi => ({
                        product_id: bi.product_id,
                        quantity: bi.quantity * item.quantity
                    }));
                } else if (product.type === 'product') {
                    // Regular Product
                    itemsToDeduct = [{ product_id: item.product_id, quantity: item.quantity }];
                }
                // Services don't deduct stock

                // 2. Process Deductions
                for (const dItem of itemsToDeduct) {
                    // Check Stock
                    const [stockRows] = await conn.query('SELECT current_stock, name FROM products WHERE id = ?', [dItem.product_id]);
                    if (!stockRows.length) continue;

                    const comp = stockRows[0];
                    if (comp.current_stock < dItem.quantity) {
                        throw new Error(`Stock insuficiente de: ${comp.name} (Req: ${dItem.quantity}, Disp: ${comp.current_stock})`);
                    }

                    // Deduct
                    await conn.query('UPDATE products SET current_stock = current_stock - ? WHERE id = ?', [dItem.quantity, dItem.product_id]);

                    // Log Move
                    await conn.query(
                        `INSERT INTO inventory_moves(product_id, transaction_id, quantity, type) VALUES(?, ?, ?, 'sale')`,
                        [dItem.product_id, transactionId, -dItem.quantity]
                    );
                }

                // CHECK FOR INSTALLATION (To create Service Order)
                // Case-insensitive check for "instalaci" or type 'service'
                if (product.name.toLowerCase().includes('instalaci')) {
                    await conn.query(
                        `INSERT INTO service_orders (client_id, type, status, created_by_user_id, created_at) 
                         VALUES (?, 'INSTALLATION', 'PENDING', ?, NOW())`,
                        [client_id || null, reqUserId]
                    );
                }
            }
        }

        // AUTO-UPDATE CLIENT DATES
        // If details_json includes "months_paid", we advance the last_paid_month
        if (client_id && details_json && details_json.months_paid > 0) {
            // Fetch current date
            const [cRows] = await conn.query('SELECT last_paid_month FROM clients WHERE id = ?', [client_id]);
            const currentLastPaid = new Date(cRows[0].last_paid_month);

            // Add months (Force Integer to prevent string concatenation "5"+"1" = "51" -> 4 years jump)
            const monthsToAdd = parseInt(details_json.months_paid, 10) || 0;
            currentLastPaid.setMonth(currentLastPaid.getMonth() + monthsToAdd);
            const newDateStr = currentLastPaid.toISOString().slice(0, 10); // YYYY-MM-DD

            // SMART STATUS: If paying months, reactivate client if suspended
            // We blindly set to 'active' if they pay months. Or should we check?
            // "Think how company works": Paying debt = Service Restoration.
            await conn.query(`
                UPDATE clients 
                SET last_paid_month = ?, mora_balance = 0, has_mora = FALSE, status = 'active', last_payment_date = NOW()
                WHERE id = ?
            `, [newDateStr, client_id]);
        }

        // If Just Mora paid? 
        if (client_id && details_json && details_json.mora_paid > 0) {
            await conn.query('UPDATE clients SET mora_balance = 0 WHERE id = ?', [client_id]);
        }

        // RECONNECTION LOGIC
        if (client_id && details_json && details_json.reconnection_paid) {
            await conn.query("UPDATE clients SET status = 'active', reconnection_date = NOW() WHERE id = ?", [client_id]);

            // Create Service Order automatically (User Request)
            await conn.query(
                `INSERT INTO service_orders (client_id, type, status, created_by_user_id, created_at) 
                 VALUES (?, 'RECONNECTION', 'PENDING', ?, NOW())`,
                [client_id, reqUserId]
            );
        }

        // HISTORY LOGGING (Requirement: "que se asocie al historial")
        // We log the payment so it appears in the Client Timeline
        const logDetails = `Pago Registrado. Factura: #${req.body.reference_id || 'S/N'}. Meses: ${details_json.months_paid || 0}. Total: ${amount}.`;
        await conn.query(
            'INSERT INTO client_logs (client_id, user_id, action, details) VALUES (?, ?, ?, ?)',
            [client_id, reqUserId, 'PAYMENT', logDetails]
        );

        await conn.commit();
        res.json({ msg: 'Cobro registrado exitosamente', transactionId });

    } catch (err) {
        await conn.rollback();
        console.error(err);
        // Return JSON so frontend can parse 'msg'
        res.status(400).json({ msg: err.message });
    } finally {
        conn.release();
    }
};

// 3. Get History (Filtered)
exports.getDailyTransactions = async (req, res) => {
    try {
        const { startDate, endDate, search, limit } = req.query;

        // Base Query
        let querySales = `
            SELECT t.id, t.amount, t.description, t.created_at, 'SALE' as type, c.full_name as client_name, t.status, t.cancellation_reason, COALESCE(t.reference_id, 'S/N_DB') as reference_id
            FROM transactions t 
            LEFT JOIN clients c ON t.client_id = c.id
            WHERE 1=1
        `;
        let queryMoves = `
            SELECT id, amount, description, created_at, type, NULL as client_name, 'COMPLETED' as status, NULL as cancellation_reason, NULL as reference_id
            FROM cash_movements
            WHERE 1=1
        `;
        const paramsSales = [];
        const paramsMoves = [];

        // Filter Logic
        if (startDate) {
            querySales += ' AND t.created_at >= ?';
            queryMoves += ' AND created_at >= ?';
            paramsSales.push(`${startDate} 00:00:00`);
            paramsMoves.push(`${startDate} 00:00:00`);
        }
        if (endDate) {
            querySales += ' AND t.created_at <= ?';
            queryMoves += ' AND created_at <= ?';
            paramsSales.push(`${endDate} 23:59:59`);
            paramsMoves.push(`${endDate} 23:59:59`);
        }

        // Search (Client Name or Description)
        if (search) {
            const likeTerm = `%${search}%`;
            querySales += ' AND (t.description LIKE ? OR c.full_name LIKE ? OR c.id LIKE ? OR t.reference_id LIKE ?)';
            queryMoves += ' AND (description LIKE ? OR id LIKE ?)'; // Moves don't have client name
            // Add params twice for sales (desc, name) - wait, query uses 3 ?
            paramsSales.push(likeTerm, likeTerm, likeTerm, likeTerm);
            paramsMoves.push(likeTerm, likeTerm);
        }

        // Pagination
        const pageNum = parseInt(limit === 'all' ? 1 : req.query.page) || 1;
        const pageSize = parseInt(limit === 'all' ? 1000000 : limit) || 10; // Default 10 rows
        const offset = (pageNum - 1) * pageSize;

        // Count Queries (for Pagination UI) - Simplified: Just fetch rows and slice? 
        // No, effective pagination needs LIMIT/OFFSET in SQL or accurate Total Count.
        // Complex with Union. Let's execute separate count queries or just one big query?
        // With Union, it's easier to fetch filtered rows then paginate in JS if dataset is small, 
        // but explicit SQL pagination is better for scale.

        // Let's stick to: Fetch ALL matching IDs (lightweight), then slice ids, then fetch details?
        // Or simple: Just apply limit to the combined UNION? 
        // MySQL doesn't easily support LIMIT on UNION without wrapping.
        // Wrapper: SELECT * FROM (QuerySales UNION ALL QueryMoves) as combined ORDER BY created_at DESC LIMIT ? OFFSET ?

        const finalQuery = `
            SELECT * FROM (
                ${querySales}
                UNION ALL
                ${queryMoves}
            ) as combined
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `;

        const finalParams = [...paramsSales, ...paramsMoves, pageSize, offset];

        const [rows] = await db.query(finalQuery, finalParams);

        // Get Total Count for Pagination
        const countQuery = `
            SELECT COUNT(*) as total FROM (
                ${querySales}
                UNION ALL
                ${queryMoves}
            ) as combined_count
        `;
        // Re-use params excluding limit/offset
        const [countRes] = await db.query(countQuery, [...paramsSales, ...paramsMoves]);
        const total = countRes[0].total;

        res.json({
            data: rows,
            pagination: {
                total,
                page: pageNum,
                limit: pageSize,
                totalPages: Math.ceil(total / pageSize)
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).send(err);
    }
};




// 4. Get Single Transaction (For Reprint)
exports.getTransactionById = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT t.*, c.full_name as client_name, c.contract_number, 
                   COALESCE(u_col.full_name, u_sess.full_name) as collector_name, 
                   COALESCE(u_col.username, u_sess.username) as collector_username
            FROM transactions t 
            LEFT JOIN clients c ON t.client_id = c.id
            LEFT JOIN cash_sessions s ON t.session_id = s.id
            LEFT JOIN users u_sess ON s.user_id = u_sess.id
            LEFT JOIN users u_col ON t.collector_id = u_col.id
            WHERE t.id = ?
        `, [req.params.id]);

        if (!rows.length) return res.status(404).json({ msg: 'Transacción no encontrada' });

        const tx = rows[0];
        // Parse details to get items
        let details = {};
        try { details = JSON.parse(tx.details_json || '{}'); } catch (e) { }

        const result = {
            ...tx,
            items: details.items || [], // Recover items for receipt
            months_paid: details.months_paid,
            mora_paid: details.mora_paid
        };
        res.json(result);
    } catch (err) { res.status(500).send(err.message); }
};

// 5. Cancel Transaction (Refund & Revert)
exports.cancelTransaction = async (req, res) => {
    const { id } = req.params;
    const { reason, current_user_id } = req.body;

    if (!reason) return res.status(400).json({ msg: 'Debe especificar un motivo de cancelación' });

    // Helper to get user ID
    const reqUserId = current_user_id || 1; // Fallback or use getValidUser logic if available in scope

    // Check if getValidUser is available in scope (it was defined at top). 
    // Yes, line 4: async function getValidUser(reqUserId) ...

    const validUserId = await getValidUser(reqUserId);
    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        // 1. Fetch Transaction
        const [rows] = await conn.query('SELECT * FROM transactions WHERE id = ?', [id]);
        if (rows.length === 0) {
            await conn.rollback();
            return res.status(404).json({ msg: 'Transacción no encontrada' });
        }
        const tx = rows[0];

        if (tx.status === 'CANCELLED') {
            await conn.rollback();
            return res.status(400).json({ msg: 'Esta transacción ya está cancelada' });
        }

        // 2. Find Open Session
        let [sessions] = await conn.query(
            'SELECT id FROM cash_sessions WHERE user_id = ? AND status = "open" LIMIT 1',
            [validUserId]
        );
        if (sessions.length === 0) {
            [sessions] = await conn.query('SELECT id FROM cash_sessions WHERE status = "open" ORDER BY id DESC LIMIT 1');
        }

        if (sessions.length === 0) {
            await conn.rollback();
            return res.status(403).json({ msg: 'No hay ninguna caja abierta para registrar el reembolso.' });
        }

        // 3. Register Refund (OUT)
        await conn.query(
            `INSERT INTO cash_movements (session_id, amount, description, type, created_at) 
             VALUES (?, ?, ?, 'OUT', NOW())`,
            [sessions[0].id, tx.amount, `Devolución Factura #${tx.reference_id || id}. Motivo: ${reason}`]
        );

        // 4. Update Transaction Status
        await conn.query(
            `UPDATE transactions 
             SET status = 'CANCELLED', cancellation_reason = ?, cancelled_by = ?, cancelled_at = NOW() 
             WHERE id = ?`,
            [reason, validUserId, id]
        );

        // 5. Revert Client Dates
        if (tx.client_id) {
            let details = {};
            try { details = JSON.parse(tx.details_json || '{}'); } catch (e) { }

            const monthsPaid = parseInt(details.months_paid, 10) || 0;

            if (monthsPaid > 0) {
                const [cRows] = await conn.query('SELECT last_paid_month FROM clients WHERE id = ?', [tx.client_id]);
                if (cRows.length > 0) {
                    const client = cRows[0];
                    if (client.last_paid_month) {
                        const newDate = new Date(client.last_paid_month);
                        // Safe decrement
                        newDate.setMonth(newDate.getMonth() - monthsPaid);
                        // Normalize to avoid date shift if day > 28? (e.g. March 31 -> Feb 28)
                        // This uses local time, but `toISOString` uses UTC.
                        // Best practice for YYYY-MM-DD store:
                        const y = newDate.getFullYear();
                        const m = newDate.getMonth() + 1; // 0-indexed
                        const d = newDate.getDate(); // Keep day (usually user wants same cutoff day)
                        const newDateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

                        await conn.query('UPDATE clients SET last_paid_month = ? WHERE id = ?', [newDateStr, tx.client_id]);
                    }
                }
            }
        }

        // 6. Log
        if (tx.client_id) {
            await conn.query(
                'INSERT INTO client_logs (client_id, user_id, action, details) VALUES (?, ?, ?, ?)',
                [tx.client_id, validUserId, 'CANCELLATION', `Factura #${tx.reference_id || id} Cancelada. Motivo: ${reason}. Reembolso: ${tx.amount}`]
            );
        }

        await conn.commit();
        res.json({ msg: 'Factura cancelada y reembolso registrado' });

    } catch (err) {
        await conn.rollback();
        console.error(err);
        res.status(500).json({ msg: 'Error al cancelar: ' + err.message });
    } finally {
        conn.release();
    }
};
