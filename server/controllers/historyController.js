const db = require('../config/db');

exports.getHistory = async (req, res) => {
    try {
        const { startDate, endDate, search, page = 1, limit = 10 } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);
        const pageSize = parseInt(limit);

        // --- FILTER BUILDING STRATEGY ---
        // We build two separate WHERE clauses for Transactions and Movements
        // Then we combine them in a clean string-interpolated UNION (or parameterized if careful)
        // For safety and simplicity with UNIONs, we will use a "Combined View" approach

        let tWhere = '1=1';
        let mWhere = '1=1';
        const params = [];

        // Transaction Params & Movement Params separation is tricky for a single params array in UNION.
        // Strategy: Build the full SQL string carefully or use named parameters (not supported by basic mysql driver usually).
        // Robust Strategy: Subqueries with their own filters, then Outer Limit.

        // We will construct the SQL with placeholders, and essentially we need two sets of parameters if we filter both sides.

        let tParams = [];
        let mParams = [];

        if (startDate) {
            tWhere += ' AND t.created_at >= ?';
            mWhere += ' AND created_at >= ?';
            tParams.push(`${startDate} 00:00:00`);
            mParams.push(`${startDate} 00:00:00`);
        }

        if (endDate) {
            tWhere += ' AND t.created_at <= ?';
            mWhere += ' AND created_at <= ?';
            tParams.push(`${endDate} 23:59:59`);
            mParams.push(`${endDate} 23:59:59`);
        }

        if (search) {
            const term = `%${search}%`;
            tWhere += ' AND (t.description LIKE ? OR c.full_name LIKE ?)';
            mWhere += ' AND description LIKE ?';
            tParams.push(term, term);
            mParams.push(term);
        }

        // --- DATA QUERY ---
        SELECT * FROM(
            SELECT 
                    t.id,
            t.amount,
            t.description,
            t.created_at,
            'SALE' as type,
            IFNULL(c.full_name, 'Cliente General') as client_name,
            t.status,
            t.cancellation_reason,
            COALESCE(NULLIF(t.reference_id, ''), '⚠️ SIN NUMERO ⚠️') as reference_id
                FROM transactions t
                LEFT JOIN clients c ON t.client_id = c.id
                WHERE ${ tWhere }
                
                UNION ALL
                
                SELECT 
                    id,
            amount,
            description,
            created_at,
            IF(type = 'IN', 'INGRESO', 'GASTO') as type,
            NULL as client_name,
            'COMPLETED' as status,
            NULL as cancellation_reason,
            NULL as reference_id
                FROM cash_movements
                WHERE ${ mWhere }
        ) as combined_history
            ORDER BY created_at DESC
        LIMIT ? OFFSET ?
            `;

        const finalParams = [...tParams, ...mParams, pageSize, offset];

        const [rows] = await db.query(unionQuery, finalParams);

        // --- COUNT QUERY ---
        const countQuery = `
            SELECT COUNT(*) as total FROM(
                SELECT t.id FROM transactions t LEFT JOIN clients c ON t.client_id = c.id WHERE ${ tWhere }
                UNION ALL
                SELECT id FROM cash_movements WHERE ${ mWhere }
            ) as total_tbl
        `;

        const countParams = [...tParams, ...mParams];
        const [countRes] = await db.query(countQuery, countParams);
        const total = countRes[0]?.total || 0;

        res.json({
            data: rows,
            pagination: {
                total,
                page: parseInt(page),
                totalPages: Math.ceil(total / pageSize)
            }
        });

    } catch (err) {
        console.error('History Error:', err);
        res.status(500).json({ msg: 'Error al obtener historial', error: err.message });
    }
};
