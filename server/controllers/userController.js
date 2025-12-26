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
            // Fallback: If no other admin found, try to find ANY active user (e.g. office) 
            // to prevent data loss or FK errors if we can't delete.
            const [others] = await db.query(`SELECT id FROM users WHERE is_active = 1 AND id != ? LIMIT 1`, [id]);
            if (others.length > 0) inheritId = others[0].id;
        }

        if (inheritId) {
            // 2. Reassign History
            await db.query(`UPDATE client_logs SET user_id = ? WHERE user_id = ?`, [inheritId, id]);
            await db.query(`UPDATE clients SET preferred_collector_id = ? WHERE preferred_collector_id = ?`, [inheritId, id]);
            await db.query(`UPDATE transactions SET collector_id = ? WHERE collector_id = ?`, [inheritId, id]);

            // Reassign Service Orders (Tech & Creator)
            // Use IGNORE in case there are weird constraints, but theoretically safe updates
            await db.query(`UPDATE service_orders SET assigned_tech_id = ? WHERE assigned_tech_id = ?`, [inheritId, id]);
            try {
                // Might fail if column doesn't exist in some versions, but confirmed exists in current code
                await db.query(`UPDATE service_orders SET created_by_user_id = ? WHERE created_by_user_id = ?`, [inheritId, id]);
            } catch (e) { console.log("Warning: Could not update created_by_user_id", e.message); }

            // Reassign Cash Sessions
            await db.query(`UPDATE cash_sessions SET user_id = ? WHERE user_id = ?`, [inheritId, id]);

        } else {
            // If no one to inherit (Deleting the LAST user?), we try setting to NULL.
            // This will fail if columns are NOT NULL.
            await db.query(`UPDATE client_logs SET user_id = NULL WHERE user_id = ?`, [id]);
            await db.query(`UPDATE clients SET preferred_collector_id = NULL WHERE preferred_collector_id = ?`, [id]);
            await db.query(`UPDATE transactions SET collector_id = NULL WHERE collector_id = ?`, [id]);
            await db.query(`UPDATE service_orders SET assigned_tech_id = NULL WHERE assigned_tech_id = ?`, [id]);
            try { await db.query(`UPDATE service_orders SET created_by_user_id = NULL WHERE created_by_user_id = ?`, [id]); } catch (e) { }
            await db.query(`UPDATE cash_sessions SET user_id = NULL WHERE user_id = ?`, [id]);
        }

        // 3. Delete
        await db.query('DELETE FROM users WHERE id = ?', [id]);

        res.json({ msg: 'Usuario eliminado permanentemente (Su historial fue transferido al Admin).' });

    } catch (err) {
        console.error("Delete User Error:", err);
        if (err.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ msg: 'No se pudo eliminar: El usuario tiene registros vinculados que no se pudieron reasignar (Foreign Key Error).' });
        }
        res.status(500).send('Server Error: ' + err.message);
    }
};
