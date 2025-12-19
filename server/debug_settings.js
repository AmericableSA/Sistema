const db = require('./config/db');

async function checkSettings() {
    try {
        const [rows] = await db.query('SELECT setting_value FROM system_settings WHERE setting_key = "cutoff_day"');
        console.log('CUTOFF_DAY:', rows.length ? rows[0].setting_value : 'NOT_FOUND');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkSettings();
