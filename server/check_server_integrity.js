const db = require('./config/db');

async function test() {
    console.log("--- 1. Testing DB Schema (Providers) ---");
    try {
        const pool = await db.getConnection();
        // Try to insert a dummy provider with the NEW columns
        // Columns: name, contact_name, phone, email, address
        await pool.query(
            "INSERT INTO providers (name, contact_name, phone, email, address) VALUES (?, ?, ?, ?, ?)",
            ['Test Prov', 'Test Contact', '88888888', 'test@test.com', 'Test Address']
        );
        console.log("✅ Provider Insert Success (Schema is correct)");
        // Clean up
        await pool.query("DELETE FROM providers WHERE name = 'Test Prov'");
    } catch (e) {
        console.error("❌ Provider Schema Error:", e.message);
    }

    console.log("--- 2. Testing Modules ---");
    const routes = [
        './routes/products',
        './routes/transactions',
        './routes/users',
        './controllers/uploadController',
        './routes/clients',
        './routes/zones',
        './routes/cities',
        './routes/billing',
        './routes/providers',
        './routes/settings',
        './routes/history',
        './routes/reports',
        './routes/auth',
        './routes/invoices'
    ];

    for (const r of routes) {
        try {
            require(r);
            console.log(`✅ Loaded ${r}`);
        } catch (e) {
            console.error(`❌ Failed to load ${r}:`, e.message);
        }
    }
    process.exit();
}

test();
