const db = require('../config/db');

// Create Invoice (Bill from Provider)
exports.createInvoice = async (req, res) => {
    try {
        console.log("Create Invoice Body:", req.body);
        const { provider_id, amount, description, due_date, reference_number, issue_date } = req.body;

        if (!provider_id || !amount) {
            return res.status(400).json({ msg: 'Faltan datos requeridos (Proveedor o Monto)' });
        }

        const [result] = await db.query(
            "INSERT INTO invoices (provider_id, amount, balance, description, due_date, reference_number, issue_date) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [provider_id, amount, amount, description, due_date, reference_number, issue_date || new Date()]
        );

        res.status(201).json({ id: result.insertId, msg: 'Factura de proveedor registrada exitosamente' });
    } catch (err) {
        console.error("Create Invoice Error:", err);
        res.status(500).json({ msg: 'Error al registrar factura: ' + err.message });
    }
};

// Get Invoices (Accounts Payable)
exports.getInvoices = async (req, res) => {
    try {
        const { provider_id, status } = req.query;
        let query = `
            SELECT i.*, p.name as provider_name, p.contact_name
            FROM invoices i
            JOIN providers p ON i.provider_id = p.id
        `;
        const params = [];
        const where = [];

        if (provider_id) {
            where.push("i.provider_id = ?");
            params.push(provider_id);
        }
        if (status && status !== 'ALL') {
            where.push("i.status = ?");
            params.push(status);
        }

        if (where.length > 0) {
            query += " WHERE " + where.join(" AND ");
        }

        query += " ORDER BY i.created_at DESC";

        const [rows] = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Error al obtener facturas' });
    }
};

// Register Payment (Expense/Outgoing)
exports.registerPayment = async (req, res) => {
    try {
        const { invoice_id } = req.params;
        const { amount, reference_number, notes } = req.body;
        const userId = req.user ? req.user.id : null;

        const payAmount = parseFloat(amount);

        // 1. Get Invoice
        const [invRows] = await db.query("SELECT * FROM invoices WHERE id = ?", [invoice_id]);
        if (invRows.length === 0) return res.status(404).json({ msg: 'Factura no encontrada' });
        const invoice = invRows[0];

        if (payAmount > invoice.balance) {
            return res.status(400).json({ msg: 'El pago excede el saldo pendiente' });
        }

        // 2. Update Invoice Balance
        const newBalance = parseFloat(invoice.balance) - payAmount;
        let newStatus = invoice.status;
        if (newBalance <= 0.05) newStatus = 'PAID';
        else newStatus = 'PARTIAL';

        await db.query("UPDATE invoices SET balance = ?, status = ? WHERE id = ?", [newBalance, newStatus, invoice_id]);

        // 3. Register OUT Transaction (Expense)
        // Note: We use type 'OUT' for expenses.
        await db.query(
            `INSERT INTO transactions 
            (invoice_id, amount, type, description, created_at, reference_number, notes, user_id) 
            VALUES (?, ?, 'OUT', ?, NOW(), ?, ?, ?)`,
            [invoice_id, payAmount, `Pago a Factura #${invoice_id} (${invoice.reference_number || 'Sin Ref'})`, reference_number, notes, userId]
        );

        res.json({ msg: 'Pago registrado', new_balance: newBalance, status: newStatus });

    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Error al registrar pago' });
    }
};

// Delete Invoice
exports.deleteInvoice = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query("DELETE FROM invoices WHERE id = ?", [id]);
        res.json({ msg: 'Factura eliminada' });
    } catch (err) {
        res.status(500).json({ msg: 'Error eliminando factura' });
    }
};
