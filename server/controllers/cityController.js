const db = require('../config/db');

exports.getCities = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM cities ORDER BY name ASC');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};
