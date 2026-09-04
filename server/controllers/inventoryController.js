const db = require('../config/db');

exports.getProductsForBilling = async (req, res) => {
    try {
        // Solo productos activos y habilitados para la venta (is_for_sale != 0)
        const [rows] = await db.query(`
            SELECT id, name, sku, selling_price as price, selling_price, current_stock, type, unit_of_measure 
            FROM products 
            WHERE is_active = 1 AND (is_for_sale IS NULL OR is_for_sale = 1)
            ORDER BY name ASC
        `);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

