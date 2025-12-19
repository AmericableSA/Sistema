const db = require('../config/db');

// --- List Zones ---
exports.getZones = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM zones ORDER BY name ASC');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// --- Create Zone ---
exports.createZone = async (req, res) => {
    const { name, tariff, description } = req.body;
    try {
        const [existing] = await db.query('SELECT id FROM zones WHERE name = ?', [name]);
        if (existing.length > 0) return res.status(400).json({ msg: 'Zona ya existe' });

        const [result] = await db.query(
            'INSERT INTO zones (name, tariff, description) VALUES (?, ?, ?)',
            [name, tariff || 0, description || '']
        );
        res.json({ id: result.insertId, msg: 'Zona creada exitosamente' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// --- Update Zone ---
exports.updateZone = async (req, res) => {
    const { id } = req.params;
    const { name, tariff, description } = req.body;
    try {
        await db.query(
            'UPDATE zones SET name=?, tariff=?, description=? WHERE id=?',
            [name, tariff, description, id]
        );
        res.json({ msg: 'Zona actualizada' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// --- Delete Zone ---
exports.deleteZone = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM zones WHERE id = ?', [id]);
        res.json({ msg: 'Zona eliminada' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};
