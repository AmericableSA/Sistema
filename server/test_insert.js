const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mysql = require('mysql2/promise');

(async () => {
    try {
        const conn = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        // Find session
        const [s] = await conn.query("SELECT id FROM cash_sessions LIMIT 1");
        const sessionId = s[0]?.id || 1;

        const ref = "TEST-" + Date.now();
        console.log("Inserting with Ref:", ref);

        await conn.query(`
            INSERT INTO transactions 
            (session_id, client_id, amount, type, payment_method, description, reference_id, created_at)
            VALUES (?, NULL, 100, 'TEST', 'cash', 'Test Ref', ?, NOW())
        `, [sessionId, ref]);

        // Check back
        const [rows] = await conn.query("SELECT * FROM transactions WHERE reference_id = ?", [ref]);
        console.log("Read back:", rows[0]);

        if (rows[0] && rows[0].reference_id === ref) {
            console.log("SUCCESS: reference_id saved correctly.");
        } else {
            console.log("FAILURE: reference_id NOT saved.");
        }

        // Clean up
        await conn.query("DELETE FROM transactions WHERE reference_id = ?", [ref]);
        conn.end();

    } catch (e) { console.error(e); }
})();
