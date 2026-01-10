const db = require('../config/db');

// Get materials designated to an order
exports.getMaterials = async (req, res) => {
    const { orderId } = req.params;
    try {
        const [rows] = await db.query(`
            SELECT som.*, p.name as product_name, p.sku, p.unit_of_measure 
            FROM service_order_materials som
            JOIN products p ON som.product_id = p.id
            WHERE som.service_order_id = ?
            ORDER BY som.created_at DESC
        `, [orderId]);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// Add material to order and deduct stock
exports.addMaterial = async (req, res) => {
    const { orderId } = req.params;
    const { product_id, quantity, user_id } = req.body;

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Check Product Stock
        const [prod] = await connection.query('SELECT current_stock, name FROM products WHERE id = ?', [product_id]);
        if (prod.length === 0) throw new Error('Product not found');

        const currentStock = Number(prod[0].current_stock);
        const qty = Number(quantity);

        // Optional: Block if insufficient stock? User might want to go negative.
        // Let's allow negative but maybe warn? For now, standard logic allows it or we can check.
        // Proceeding with stock deduction.

        // 2. Insert into service_order_materials
        const [result] = await connection.query(
            'INSERT INTO service_order_materials (service_order_id, product_id, quantity) VALUES (?, ?, ?)',
            [orderId, product_id, qty]
        );

        // 3. Deduct Stock from Products
        await connection.query('UPDATE products SET current_stock = current_stock - ? WHERE id = ?', [qty, product_id]);

        // 4. Log Inventory Transaction
        await connection.query(
            'INSERT INTO inventory_transactions (product_id, transaction_type, quantity, unit_price, reason, user_id) VALUES (?, ?, ?, ?, ?, ?)',
            [product_id, 'OUT', qty, 0, `Usado en Trámite #${orderId}`, user_id || 1]
        );

        // 5. Log Client History (so it appears in timeline)
        // Need to get client_id from service_order
        const [orderInfo] = await connection.query('SELECT client_id FROM service_orders WHERE id = ?', [orderId]);
        if (orderInfo.length > 0) {
            const clientId = orderInfo[0].client_id;
            await connection.query(
                'INSERT INTO client_logs (client_id, user_id, action, details) VALUES (?, ?, ?, ?)',
                [clientId, user_id || 1, 'MATERIAL_USED', `Material agregado a Orden #${orderId}: ${prod[0].name} (x${qty})`]
            );
        }

        await connection.commit();

        // Return created item with details
        res.status(201).json({
            id: result.insertId,
            service_order_id: orderId,
            product_id,
            quantity,
            product_name: prod[0].name
        });

    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ msg: 'Error: ' + err.message });
    } finally {
        connection.release();
    }
};

// Remove material and restore stock
exports.removeMaterial = async (req, res) => {
    const { id } = req.params; // material record id
    const { user_id } = req.body;

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Get info before delete
        const [record] = await connection.query('SELECT * FROM service_order_materials WHERE id = ?', [id]);
        if (record.length === 0) {
            await connection.rollback();
            return res.status(404).json({ msg: 'Record not found' });
        }
        const { product_id, quantity, service_order_id } = record[0];

        // 2. Delete Record
        await connection.query('DELETE FROM service_order_materials WHERE id = ?', [id]);

        // 3. Restore Stock
        await connection.query('UPDATE products SET current_stock = current_stock + ? WHERE id = ?', [quantity, product_id]);

        // 4. Log Transaction
        await connection.query(
            'INSERT INTO inventory_transactions (product_id, transaction_type, quantity, unit_price, reason, user_id) VALUES (?, ?, ?, ?, ?, ?)',
            [product_id, 'IN', quantity, 0, `Restaurado de Trámite #${service_order_id}`, user_id || 1]
        );

        // 5. Log Client History
        const [orderInfo] = await connection.query('SELECT client_id FROM service_orders WHERE id = ?', [service_order_id]);
        if (orderInfo.length > 0) {
            const clientId = orderInfo[0].client_id;
            // Get product name for better log
            const [pInfo] = await connection.query('SELECT name FROM products WHERE id = ?', [product_id]);
            const pName = pInfo.length > 0 ? pInfo[0].name : 'Producto';

            await connection.query(
                'INSERT INTO client_logs (client_id, user_id, action, details) VALUES (?, ?, ?, ?)',
                [clientId, user_id || 1, 'MATERIAL_REMOVED', `Material eliminado de Orden #${service_order_id}: ${pName} (x${quantity})`]
            );
        }

        await connection.commit();
        res.json({ message: 'Material removed and stock restored' });

    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ msg: err.message });
    } finally {
        connection.release();
    }
};
