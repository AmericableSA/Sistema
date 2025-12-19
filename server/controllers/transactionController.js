const db = require('../config/db');

// Get all transactions (History)
exports.getTransactions = async (req, res) => {
    try {
        const query = `
            SELECT t.*, p.name as product_name, u.username as user_name 
            FROM inventory_transactions t
            JOIN products p ON t.product_id = p.id
            LEFT JOIN users u ON t.user_id = u.id
            ORDER BY t.created_at DESC
        `;
        const [rows] = await db.query(query);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// Create a transaction (IN/OUT)
exports.createTransaction = async (req, res) => {
    const { product_id, transaction_type, quantity, reason, user_id } = req.body;

    if (!['IN', 'OUT'].includes(transaction_type)) {
        return res.status(400).json({ msg: 'Invalid transaction type' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Record Transaction
        await connection.query(
            'INSERT INTO inventory_transactions (product_id, transaction_type, quantity, reason, user_id) VALUES (?, ?, ?, ?, ?)',
            [product_id, transaction_type, quantity, reason, user_id]
        );

        // 2. Update Product Stock
        const operator = transaction_type === 'IN' ? '+' : '-';
        await connection.query(
            `UPDATE products SET current_stock = current_stock ${operator} ? WHERE id = ?`,
            [quantity, product_id]
        );

        await connection.commit();
        res.status(201).json({ msg: 'Transaction successful' });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).send('Transaction Failed');
    } finally {
        connection.release();
    }
};
