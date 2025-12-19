
const db = require('../config/db');

// Get all settings
exports.getSettings = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM system_settings');
        const settings = rows.reduce((acc, row) => {
            acc[row.setting_key] = row.setting_value;
            return acc;
        }, {});
        res.json(settings);
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Server Error' });
    }
};

// Update settings
exports.updateSettings = async (req, res) => {
    const settings = req.body; // Expect { key: value, key2: value2 }
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        for (const [key, value] of Object.entries(settings)) {
            // Upsert
            await connection.query(
                'INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
                [key, value, value]
            );
        }

        await connection.commit();
        res.json({ msg: 'Configuración actualizada' });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ msg: 'Server Error' });
    } finally {
        connection.release();
    }
};
