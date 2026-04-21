const db = require('../server/config/db');

async function check() {
    try {
        const [tables] = await db.query("SHOW TABLES LIKE 'cash_movements'");
        if (tables.length === 0) {
            console.log("TABLE cash_movements MISSING");
        } else {
            const [columns] = await db.query("DESCRIBE cash_movements");
            console.log("COLUMNS cash_movements:", columns);
        }

        const [txColumns] = await db.query("DESCRIBE transactions");
        console.log("COLUMNS transactions:", txColumns);
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
