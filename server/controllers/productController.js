const db = require('../config/db');

// Get all products
exports.getAllProducts = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM products ORDER BY name ASC');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// Get Bundle Items
exports.getBundleDetails = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.query(`
            SELECT bi.*, p.name, p.sku, p.current_stock 
            FROM bundle_items bi
            JOIN products p ON bi.product_id = p.id
            WHERE bi.bundle_id = ?
        `, [id]);
        res.json(rows);
    } catch (err) { res.status(500).send(err); }
};

// Create a new product
exports.createProduct = async (req, res) => {
    const { sku, name, description, category_id, provider_id, current_stock, min_stock_alert, unit_cost, selling_price, type, bundle_items, unit_of_measure } = req.body;

    // Default to 'product' if not specified
    const prodType = type || 'product';
    const initialStock = prodType === 'bundle' ? 0 : (current_stock || 0); // Bundles don't carry physical stock themselves usually, or calculated.

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [result] = await connection.query(
            'INSERT INTO products (sku, name, description, category_id, provider_id, current_stock, min_stock_alert, unit_cost, selling_price, type, unit_of_measure) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [sku, name, description, category_id, provider_id || null, initialStock, min_stock_alert || 5, unit_cost || 0, selling_price, prodType, unit_of_measure || 'Unidad']
        );
        const newId = result.insertId;

        // If Bundle, insert items
        if (prodType === 'bundle' && Array.isArray(bundle_items) && bundle_items.length > 0) {
            for (const item of bundle_items) {
                await connection.query(
                    'INSERT INTO bundle_items (bundle_id, product_id, quantity) VALUES (?, ?, ?)',
                    [newId, item.product_id, item.quantity]
                );
            }
        }

        // 1. Log Initial Stock Transaction (if stock > 0 and not bundle)
        if (initialStock > 0 && prodType === 'product') {
            await connection.query(
                'INSERT INTO inventory_transactions (product_id, transaction_type, quantity, unit_price, reason, user_id) VALUES (?, ?, ?, ?, ?, ?)',
                [newId, 'IN', initialStock, unit_cost || 0, 'Stock Inicial', req.body.user_id || 1]
            );
        }

        await connection.commit();
        res.status(201).json({ id: newId, ...req.body });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ msg: 'Server Error: ' + err.message });
    } finally {
        connection.release();
    }
};

// Update a product
exports.updateProduct = async (req, res) => {
    const { id } = req.params;
    const { sku, name, description, category_id, provider_id, current_stock, min_stock_alert, unit_cost, selling_price, user_id, reason, type, bundle_items, unit_of_measure } = req.body;

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Get old data
        const [oldData] = await connection.query('SELECT * FROM products WHERE id = ?', [id]);
        if (oldData.length === 0) {
            await connection.rollback();
            return res.status(404).json({ msg: 'Product not found' });
        }
        const oldProduct = oldData[0];

        // 2. Detect changes
        let changes = [];
        if (oldProduct.name !== name) changes.push(`Nombre: ${oldProduct.name} -> ${name}`);
        if (Number(oldProduct.selling_price) !== Number(selling_price)) changes.push(`Precio: C$ ${oldProduct.selling_price} -> C$ ${selling_price}`);
        if (oldProduct.sku !== sku) changes.push(`SKU: ${oldProduct.sku} -> ${sku}`);
        if (String(oldProduct.description || '') !== String(description || '')) changes.push('Descripción modificada');
        if (String(oldProduct.unit_of_measure || 'Unidad') !== String(unit_of_measure || 'Unidad')) changes.push(`Unidad: ${oldProduct.unit_of_measure} -> ${unit_of_measure}`);

        // Critical: Detect Stock Change
        const oldStock = Number(oldProduct.current_stock);
        const newStock = Number(current_stock);
        let stockDiff = 0;

        // Only track stock diff for physical items or if changed manually
        if (oldStock !== newStock) {
            stockDiff = newStock - oldStock;
            changes.push(`Stock: ${oldStock} -> ${newStock}`);
        }

        // 3. Update Product Main Data
        await connection.query(
            'UPDATE products SET sku=?, name=?, description=?, category_id=?, provider_id=?, current_stock=?, min_stock_alert=?, unit_cost=?, selling_price=?, type=?, unit_of_measure=? WHERE id=?',
            [sku, name, description, category_id, provider_id || null, current_stock, min_stock_alert, unit_cost, selling_price, type || oldProduct.type, unit_of_measure || 'Unidad', id]
        );

        // 4. Handle Bundle Items Update (Delete All + Re-insert)
        // Only if type is bundle
        if (type === 'bundle' || oldProduct.type === 'bundle') {
            await connection.query('DELETE FROM bundle_items WHERE bundle_id = ?', [id]);

            if (Array.isArray(bundle_items) && bundle_items.length > 0) {
                for (const item of bundle_items) {
                    await connection.query(
                        'INSERT INTO bundle_items (bundle_id, product_id, quantity) VALUES (?, ?, ?)',
                        [id, item.product_id, item.quantity]
                    );
                }
                changes.push('Items del Combo Actualizados');
            }
        }

        // 5. Log Transaction (ALWAYS if changes > 0 OR reason is provided)
        if (changes.length > 0 || reason) {
            const changesText = changes.length > 0 ? changes.join(', ') : 'Edición sin cambios detectados';
            const auditReason = reason ? `${reason} | ${changesText}` : changesText;

            // Determine transaction type based on stock movement
            let transType = 'EDIT';
            let transQty = 0;

            if (stockDiff !== 0) {
                transType = stockDiff > 0 ? 'IN' : 'OUT';
                transQty = Math.abs(stockDiff);
            }

            // Use current unit_cost for the record
            const recordedCost = unit_cost || oldProduct.unit_cost || 0;

            await connection.query(
                'INSERT INTO inventory_transactions (product_id, transaction_type, quantity, unit_price, reason, user_id) VALUES (?, ?, ?, ?, ?, ?)',
                [id, transType, transQty, recordedCost, auditReason, user_id || 1]
            );
        }

        await connection.commit();
        res.json({ message: 'Product updated successfully' });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ msg: 'Server Error: ' + err.message });
    } finally {
        connection.release();
    }
};

// Delete a product
exports.deleteProduct = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM products WHERE id = ?', [id]);
        res.json({ message: 'Product deleted successfully' });
    } catch (err) {
        console.error(err);
        if (err.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ msg: 'No se puede eliminar: El producto tiene movimientos o ventas asociadas.' });
        }
        res.status(500).send('Server Error');
    }
};


// Get All Inventory History
exports.getAllInventoryHistory = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT t.*, t.transaction_date as created_at, p.name as product_name, p.sku, u.full_name as user_name 
            FROM inventory_transactions t
            LEFT JOIN products p ON t.product_id = p.id
            LEFT JOIN users u ON t.user_id = u.id
            ORDER BY t.transaction_date DESC
        `);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// Export Products to Excel
exports.exportProductsXLS = async (req, res) => {
    try {
        const ExcelJS = require('exceljs');
        const search = (req.query.search || '').trim();

        let whereClauses = [];
        let params = [];

        if (search) {
            const like = `%${search}%`;
            whereClauses.push('(name LIKE ? OR sku LIKE ?)');
            params.push(like, like);
        }

        const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

        const [rows] = await db.query(`SELECT * FROM products ${whereSql} ORDER BY name ASC`, params);

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Inventario');

        worksheet.columns = [
            { header: 'SKU', key: 'sku', width: 15 },
            { header: 'Producto', key: 'name', width: 40 },
            { header: 'Descripción', key: 'description', width: 40 },
            { header: 'Tipo', key: 'type', width: 15 },
            { header: 'Stock', key: 'stock', width: 10 },
            { header: 'Unidad', key: 'unit', width: 10 },
            { header: 'Precio', key: 'price', width: 15 },
            { header: 'Costo', key: 'cost', width: 15 }
        ];

        worksheet.getRow(1).font = { bold: true };

        rows.forEach(p => {
            let typeMap = {
                'product': 'Producto',
                'service': 'Servicio',
                'bundle': 'Combo'
            };

            worksheet.addRow({
                sku: p.sku || '',
                name: p.name,
                description: p.description || '',
                type: typeMap[p.type] || p.type,
                stock: p.current_stock,
                unit: p.unit_of_measure || 'Unidad',
                price: parseFloat(p.selling_price),
                cost: parseFloat(p.unit_cost)
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="Reporte_Inventario.xlsx"');

        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {
        console.error(err);
        res.status(500).send('Error exportando excel: ' + err.message);
    }
};
