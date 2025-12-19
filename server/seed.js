const db = require('./config/db');

const seedData = async () => {
    try {
        console.log('🔧 Repairing Schema & Seeding Data...');

        // Attempt to add 'description' to categories if missing
        try {
            await db.query(`ALTER TABLE categories ADD COLUMN description TEXT`);
            console.log('Added description to categories');
        } catch (e) { /* Ignore if exists */ }

        // Attempt to add 'description' to products if missing
        try {
            await db.query(`ALTER TABLE products ADD COLUMN description TEXT`);
            console.log('Added description to products');
        } catch (e) { /* Ignore if exists */ }

        // 1. Categories
        await db.query(`INSERT IGNORE INTO categories (name, description) VALUES 
            ('Cables', 'Todo tipo de cables coaxiales y fibra'),
            ('Conectores', 'Conectores RG6, RJ45, etc'),
            ('Equipos', 'Routers, ONUs, Decodificadores')`);

        // 2. Providers
        await db.query(`INSERT IGNORE INTO providers (name, contact_name, phone) VALUES 
            ('Comtech Nicaragua', 'Carlos Ventas', '8888-8888'),
            ('Cisco Supply', 'Maria Import', '2222-2222')`);

        // 3. Products
        await db.query(`INSERT IGNORE INTO products (sku, name, description, category_id, provider_id, current_stock, min_stock_alert, unit_cost, selling_price) VALUES 
            ('CAB-RG6', 'Cable Coaxial RG6 (Bobina)', 'Bobina 305mts', 1, 1, 10, 2, 45.00, 0.00),
            ('CON-RG6', 'Conector RG6 Compresión', 'Bolsa 100u', 2, 1, 500, 100, 0.15, 0.00),
            ('ROU-840', 'Router TP-Link 840N', '300Mbps', 3, 2, 25, 5, 14.50, 25.00)`);

        console.log('✅ Data Seeded Successfully');
        process.exit();
    } catch (err) {
        console.error('❌ Error Seeding:', err);
        process.exit(1);
    }
};

seedData();
