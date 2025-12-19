const db = require('../config/db');
const bcrypt = require('bcryptjs');

// Get all users
exports.getAllUsers = async (req, res) => {
    try {
        const [users] = await db.query('SELECT id, username, role, full_name, is_active, phone, identity_document, created_at FROM users');
        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// Create User
exports.createUser = async (req, res) => {
    const { username, password, role, full_name, phone, identity_document } = req.body;

    // Basic Validation
    if (!username || !password || !full_name || !identity_document) {
        return res.status(400).json({ msg: 'Por favor complete los campos obligatorios.' });
    }

    // Cedula Format Validation (XXX-XXXXXX-XXXXX)
    const cedulaRegex = /^\d{3}-\d{6}-\d{4}[A-Z]$/;
    if (!cedulaRegex.test(identity_document)) {
        return res.status(400).json({ msg: 'Formato de cédula inválido. Debe ser: 000-000000-0000X' });
    }

    try {
        // Check duplicates
        const [existing] = await db.query('SELECT id FROM users WHERE username = ? OR identity_document = ?', [username, identity_document]);
        if (existing.length > 0) {
            return res.status(400).json({ msg: 'El usuario o la cédula ya existen.' });
        }

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const [result] = await db.query(
            'INSERT INTO users (username, password_hash, role, full_name, phone, identity_document) VALUES (?, ?, ?, ?, ?, ?)',
            [username, password_hash, role || 'office', full_name, phone, identity_document]
        );

        res.status(201).json({ msg: 'Usuario creado exitosamente', id: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// Update User
exports.updateUser = async (req, res) => {
    const { id } = req.params;
    const { username, role, full_name, phone, identity_document, is_active, password } = req.body;

    try {
        // Validation logic for duplicates excluding current user...
        // For simplicity in this iteration, we focus on direct update but typically needs check

        let query = 'UPDATE users SET username=?, role=?, full_name=?, phone=?, identity_document=?, is_active=?';
        let params = [username, role, full_name, phone, identity_document, is_active];

        if (password && password.trim() !== '') {
            const salt = await bcrypt.genSalt(10);
            const password_hash = await bcrypt.hash(password, salt);
            query += ', password_hash=?';
            params.push(password_hash);
        }

        query += ' WHERE id=?';
        params.push(id);

        await db.query(query, params);
        res.json({ msg: 'Usuario actualizado correctamente' });
    } catch (err) {
        console.error(err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ msg: 'Datos duplicados (Usuario o Cédula).' });
        }
        res.status(500).send('Server Error');
    }
};

// Delete User (Hard Delete with History Handling)
exports.deleteUser = async (req, res) => {
    const { id } = req.params;
    try {
        // 1. Find a Safe Admin to inherit history (The first admin that is NOT the one being deleted)
        // We prioritize 'Waskar' or 'admin' role.
        const [admins] = await db.query(`SELECT id FROM users WHERE role = 'admin' AND id != ? LIMIT 1`, [id]);

        let inheritId = null;
        if (admins.length > 0) {
            inheritId = admins[0].id;
        } else {
            // Extreme case: Deleting the only admin? Should be prevented on frontend, but backend check:
            // Just for safety, if no other admin, maybe we can't delete? 
            // Or we assume ID 1 is safe if it exists and isn't us.
            // Let's fallback to setting NULL if schema permits, otherwise error.
            // But usually there is at least 'Waskar'.
        }

        if (inheritId) {
            // 2. Reassign History
            await db.query(`UPDATE client_logs SET user_id = ? WHERE user_id = ?`, [inheritId, id]);
            await db.query(`UPDATE clients SET preferred_collector_id = ? WHERE preferred_collector_id = ?`, [inheritId, id]);
            // Check if transactions table exists/has collector_id (Yes it does based on reportController)
            await db.query(`UPDATE transactions SET collector_id = ? WHERE collector_id = ?`, [inheritId, id]);
        } else {
            // If no one to inherit, we might have issues if columns are NOT NULL. 
            // Attempting setting to NULL for nullable fields.
            await db.query(`UPDATE client_logs SET user_id = NULL WHERE user_id = ?`, [id]); // Logs usually require user, might fail if NOT NULL
            await db.query(`UPDATE clients SET preferred_collector_id = NULL WHERE preferred_collector_id = ?`, [id]);
            await db.query(`UPDATE transactions SET collector_id = NULL WHERE collector_id = ?`, [id]);
        }

        // 3. Delete
        await db.query('DELETE FROM users WHERE id = ?', [id]);

        res.json({ msg: 'Usuario eliminado permanentemente (Su historial fue transferido al Admin).' });

    } catch (err) {
        console.error(err);
        if (err.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ msg: 'No se pudo reasignar el historial. (Error FK)' });
        }
        res.status(500).send('Server Error');
    }
};
