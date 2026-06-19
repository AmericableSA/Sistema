const db = require('../config/db');

// Get all providers
exports.getAllProviders = async (req, res) => {
    try {
        // Map English DB columns back to Spanish for frontend consistency
        const [rows] = await db.query(`
            SELECT 
                id, 
                name as nombre, 
                contact_name as contacto, 
                phone as telefono, 
                email, 
                address as direccion 
            FROM providers 
            ORDER BY name ASC
        `);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// Create a provider
exports.createProvider = async (req, res) => {
    // Frontend sends Spanish fields
    const { nombre, contacto, telefono, email, direccion } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO providers (name, contact_name, phone, email, address) VALUES (?, ?, ?, ?, ?)',
            [nombre, contacto, telefono, email, direccion]
        );
        res.status(201).json({ id: result.insertId, ...req.body });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// Update provider
exports.updateProvider = async (req, res) => {
    const { id } = req.params;
    const { nombre, contacto, telefono, email, direccion } = req.body;
    try {
        await db.query(
            'UPDATE providers SET name=?, contact_name=?, phone=?, email=?, address=? WHERE id=?',
            [nombre, contacto, telefono, email, direccion, id]
        );
        res.json({ message: 'Provider updated' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// Delete provider
exports.deleteProvider = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM providers WHERE id = ?', [id]);
        res.json({ msg: 'Proveedor eliminado exitosamente' });
    } catch (err) {
        console.error("Delete Provider Error:", err);
        if (err.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ msg: 'No se puede eliminar el proveedor porque tiene productos asociados en el inventario.' });
        }
        res.status(500).json({ msg: 'Error interno del servidor al intentar eliminar el proveedor.' });
    }
};
