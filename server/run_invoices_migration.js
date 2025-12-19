const db = require('./config/db');
const fs = require('fs');
const path = require('path');

const run = async () => {
    try {
        console.log('Creating invoices table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS invoices (
                id INT AUTO_INCREMENT PRIMARY KEY,
                client_id INT NOT NULL,
                amount DECIMAL(10, 2) NOT NULL,
                balance DECIMAL(10, 2) NOT NULL,
                status ENUM('PENDING', 'PARTIAL', 'PAID', 'CANCELLED') DEFAULT 'PENDING',
                description VARCHAR(255),
                due_date DATE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
            )
        `);
        console.log('Invoices table created.');

        console.log('Updating transactions table...');
        try {
            await db.query("ALTER TABLE transactions ADD COLUMN invoice_id INT NULL");
            await db.query("ALTER TABLE transactions ADD CONSTRAINT fk_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL");
            console.log('Added invoice_id to transactions.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') console.log('invoice_id already exists.');
            else console.error('Error adding invoice_id:', e.message);
        }

        try {
            await db.query("ALTER TABLE transactions ADD COLUMN reference_number VARCHAR(100) NULL");
            console.log('Added reference_number.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') console.log('reference_number already exists.');
            else console.error(e.message);
        }

        try {
            await db.query("ALTER TABLE transactions ADD COLUMN notes TEXT NULL");
            console.log('Added notes.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') console.log('notes already exists.');
            else console.error(e.message);
        }

        console.log('Schema migration complete.');
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

run();
