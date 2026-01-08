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

exports.createCity = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ message: 'El nombre es obligatorio' });

        await db.query('INSERT INTO cities (name) VALUES (?)', [name]);
        res.json({ message: 'Ciudad creada exitosamente' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

exports.updateCity = async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        if (!name) return res.status(400).json({ message: 'El nombre es obligatorio' });

        await db.query('UPDATE cities SET name = ? WHERE id = ?', [name, id]);
        res.json({ message: 'Ciudad actualizada' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

exports.deleteCity = async (req, res) => {
    try {
        const { id } = req.params;
        // Optional: Check if used in clients before delete, allowing DB to throw error if FK constraint exists is also a strategy,
        // but for now simple delete.
        await db.query('DELETE FROM cities WHERE id = ?', [id]);
        res.json({ message: 'Ciudad eliminada' });
    } catch (err) {
        console.error(err);
        if (err.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ message: 'No se puede eliminar: Esta ciudad está en uso por clientes.' });
        }
        res.status(500).send('Server Error');
    }
};
