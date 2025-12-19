const db = require('./config/db');

async function checkRequired() {
    try {
        const pool = await db.getConnection();
        const [columns] = await pool.query("SHOW COLUMNS FROM users");

        console.log("--- REQUIRED FIELDS (No Default) ---");
        const required = columns.filter(c => c.Null === 'NO' && c.Default === null && c.Extra !== 'auto_increment');
        required.forEach(c => console.log(`- ${c.Field} (${c.Type})`));

        console.log("\n--- ALL COLUMNS ---");
        columns.forEach(c => console.log(c.Field));

        pool.release();
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkRequired();
