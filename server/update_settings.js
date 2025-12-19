const db = require('./config/db');

async function updateSettings() {
    try {
        await db.query('UPDATE system_settings SET setting_value = "18" WHERE setting_key = "cutoff_day"');
        console.log('UPDATED_CUTOFF_TO_18');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

updateSettings();
