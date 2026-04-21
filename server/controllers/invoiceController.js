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
    const { invoice_id } = req.params;
    const { amount, reference_number, notes } = req.body;
    const userId = req.user ? req.user.id : null;

    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
        return res.status(400).json({ msg: 'Monto de pago inválido.' });
    }

    const payAmount = parseFloat(amount);
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Get Invoice with Lock
        const [invRows] = await connection.query("SELECT * FROM invoices WHERE id = ? FOR UPDATE", [invoice_id]);
        if (invRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ msg: 'Factura no encontrada' });
        }
        const invoice = invRows[0];

        if (payAmount > parseFloat(invoice.balance) + 0.01) {
            await connection.rollback();
            return res.status(400).json({ msg: `El pago (C$ ${payAmount}) excede el saldo pendiente (C$ ${invoice.balance})` });
        }

        // 2. Update Invoice Balance
        const newBalance = Math.max(0, parseFloat(invoice.balance) - payAmount);
        let newStatus = invoice.status;
        if (newBalance <= 0.05) newStatus = 'PAID';
        else newStatus = 'PARTIAL';

        await connection.query(
            "UPDATE invoices SET balance = ?, status = ?, updated_at = NOW() WHERE id = ?",
            [newBalance, newStatus, invoice_id]
        );

        // 3. Register OUT Transaction (Expense)
        await connection.query(
            `INSERT INTO transactions 
            (invoice_id, amount, type, description, created_at, reference_number, notes, user_id) 
            VALUES (?, ?, 'OUT', ?, NOW(), ?, ?, ?)`,
            [
                invoice_id, 
                payAmount, 
                `Pago a Factura Proveedor #${invoice_id} (${invoice.reference_number || 'Sin Ref'})`, 
                reference_number || null, 
                notes || null, 
                userId
            ]
        );

        await connection.commit();
        res.json({ msg: 'Pago registrado exitosamente', new_balance: newBalance, status: newStatus });

    } catch (err) {
        await connection.rollback();
        console.error("Register Payment Error:", err);
        res.status(500).json({ msg: 'Error crítico al registrar pago: ' + err.message });
    } finally {
        connection.release();
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
