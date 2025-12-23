const db = require('../config/db');
const bcrypt = require('bcryptjs');

exports.login = async (req, res) => {
    const { username, password } = req.body;
    let pool;
    try {
        pool = await db.getConnection();
        // Check if user exists
        const [users] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);

        if (users.length === 0) {
            return res.status(404).json({ msg: 'Usuario no encontrado' });
        }

        const user = users[0];

        // Compare hashed password
        const isMatch = await bcrypt.compare(password, user.password_hash || user.password); // Fallback to 'password' column if migration incomplete, but mainly password_hash

        if (!isMatch) {
            return res.status(401).json({ msg: 'Contraseña incorrecta' });
        }

        // Return user info (excluding password)
        res.json({
            id: user.id,
            username: user.username,
            full_name: user.full_name,
            role: user.role
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Error en el servidor' });
    } finally {
        if (pool) pool.release();
    }
};
