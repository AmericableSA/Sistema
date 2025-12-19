const db = require('./config/db');

(async () => {
    try {
        console.log('Checking transactions...');
        const [rows] = await db.query('SELECT count(*) as count FROM transactions');
        console.log('Transaction count:', rows[0].count);

        const [recent] = await db.query('SELECT * FROM transactions ORDER BY created_at DESC LIMIT 5');
        console.log('Recent transactions:', JSON.stringify(recent, null, 2));

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
})();
