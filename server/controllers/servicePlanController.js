const db = require('../config/db');

exports.getPlans = async (req, res) => {
    try {
        const [plans] = await db.query('SELECT * FROM service_plans WHERE is_active = 1');

        // Fetch items for each plan
        for (let plan of plans) {
            const [items] = await db.query(`
                SELECT spi.product_id, spi.quantity, p.name, p.price 
                FROM service_plan_items spi
                JOIN products p ON spi.product_id = p.id
                WHERE spi.service_plan_id = ?
            `, [plan.id]);
            plan.items = items;
        }

        res.json(plans);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};
