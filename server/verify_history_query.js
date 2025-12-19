const db = require('./config/db');

async function testQuery() {
    try {
        console.log("Testing History Query logic...");

        const startDate = null;
        const endDate = null;
        const search = null;
        const limit = 10;
        const offset = 0;

        let tWhere = '1=1';
        let mWhere = '1=1';
        const tParams = [];
        const mParams = [];

        // --- DATA QUERY ---
        const unionQuery = `
            SELECT * FROM (
                SELECT 
                    t.id, 
                    t.amount, 
                    t.description, 
                    t.created_at, 
                    'SALE' as type, 
                    IFNULL(c.full_name, 'Cliente General') as client_name 
                FROM transactions t
                LEFT JOIN clients c ON t.client_id = c.id
                WHERE ${tWhere}
                
                UNION ALL
                
                SELECT 
                    id, 
                    amount, 
                    description, 
                    created_at, 
                    IF(type='IN', 'INGRESO', 'GASTO') as type, 
                    NULL as client_name 
                FROM cash_movements
                WHERE ${mWhere}
            ) as combined_history
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `;

        const finalParams = [...tParams, ...mParams, limit, offset];

        console.log("Executing Query...");
        const [rows] = await db.query(unionQuery, finalParams);
        console.log("Success! Rows retrieved:", rows.length);
        if (rows.length > 0) console.log("Sample:", rows[0]);

        process.exit(0);

    } catch (e) {
        console.error("Query Failed:", e);
        process.exit(1);
    }
}

testQuery();
