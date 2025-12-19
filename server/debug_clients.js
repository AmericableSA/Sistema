const db = require('./config/db');

async function checkClients() {
    try {
        const [rows] = await db.query('SELECT id, full_name, contract_number, created_at, installation_date FROM clients LIMIT 5');
        console.log(JSON.stringify(rows));
        process.exit(0);
    } catch (err) {
        console.log("Error checking installation_date, trying just created_at");
        try {
            // Fallback if installation_date doesn't exist
            const [rows2] = await db.query('SELECT id, full_name, contract_number, created_at FROM clients LIMIT 5');
            console.log(JSON.stringify(rows2));
            process.exit(0);
        } catch (e) { console.error(e); process.exit(1); }
    }
}

checkClients();
