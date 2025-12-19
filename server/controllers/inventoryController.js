const db = require('../config/db');

exports.getProductsForBilling = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id, name, price, stock FROM products WHERE is_active = 1 ORDER BY name ASC');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};
