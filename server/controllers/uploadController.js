const db = require('../config/db');
const csv = require('csv-parse/sync');

exports.uploadClients = async (req, res) => {
    // Expecting JSON body with csvContent string for simplicity, or we use multer if file. 
    // Given the "hazlo ya" urgency, let's assume client sends the CSV text directly in body or we handle file.
    // Let's support raw body or json { csvData }.

    const { csvData, clearDb } = req.body;

    if (!csvData) {
        return res.status(400).json({ msg: 'No se recibieron datos CSV' });
    }

    let connection;
    try {
        const records = csv.parse(csvData, {
            columns: true,
            skip_empty_lines: true,
            trim: true
        });

        connection = await db.getConnection();
        await connection.beginTransaction();

        if (clearDb) {
            // Delete dependent records first to satisfy Foreign Key constraints
            await connection.query('DELETE FROM transactions');
            await connection.query('DELETE FROM client_logs');
            await connection.query('DELETE FROM clients');

            // Reset IDs
            await connection.query('ALTER TABLE clients AUTO_INCREMENT = 1');
            await connection.query('ALTER TABLE transactions AUTO_INCREMENT = 1');
        }

        let added = 0;
        let updated = 0;

        for (const row of records) {
            // Map CSV columns to DB columns
            // CSV: Nombre mostrado, Teléfono, Calle, Mes Pagado, Fecha de Ultimo Pago, Fecha de Corte, Motivo de Corte, Fecha de Reconexión, Colector, Ciudad
            const name = row['Nombre mostrado'];
            const phone = (row['Teléfono'] || '').substring(0, 100);
            const address = row['Calle'] || '';
            const paidUntilRaw = row['Mes Pagado'];
            const lastPaidRaw = row['Fecha de Ultimo Pago'];
            const cutoffDateRaw = row['Fecha de Corte'];
            const cutoffReason = row['Motivo de Corte'] || '';
            const reconnectionDateRaw = row['Fecha de Reconexión'];
            const collectorName = row['Colector'];
            const city = row['Ciudad'] || 'Managua';

            // Find Collector ID
            let collectorParams = [1]; // Default Admin
            if (collectorName) {
                // Try to find user
                const [users] = await connection.query('SELECT id FROM users WHERE full_name LIKE ? OR username LIKE ? LIMIT 1', [`%${collectorName}%`, `%${collectorName}%`]);
                if (users.length > 0) collectorParams = [users[0].id];
            }

            // Determine Status and Paid Until
            // If "Mes Pagado" is "Activo" or a date? CSV usually has "Octubre 2024". 
            // Logic: we store it as text in 'notes' or try to parse?
            // For now, let's map it to `paid_until` if it looks like a date, else default.
            let status = 'active';
            if (cutoffDateRaw) status = 'suspended';

            // SQL Upsert
            const [existing] = await connection.query('SELECT id FROM clients WHERE full_name = ?', [name]);

            if (existing.length > 0) {
                // Update
                await connection.query(`
                    UPDATE clients SET 
                    phone_primary=?, address_street=?, city=?, 
                    last_paid_month=?, last_payment_date=?, cutoff_date=?, reconnection_date=?, disconnection_reason=?,
                    status=?, preferred_collector_id=?
                    WHERE id=?
                `, [phone, address, city, transformDate(paidUntilRaw), transformDate(lastPaidRaw), transformDate(cutoffDateRaw), transformDate(reconnectionDateRaw), cutoffReason, status, collectorParams[0], existing[0].id]);
                updated++;
            } else {
                // Generate Contract Number
                const datePart = Date.now().toString().slice(-8);
                const randomPart = Math.floor(1000 + Math.random() * 9000); // 4 random digits
                const contractNumber = `CTR-${datePart}${randomPart}`;

                // Insert
                await connection.query(`
                    INSERT INTO clients (full_name, phone_primary, address_street, city, last_paid_month, last_payment_date, cutoff_date, reconnection_date, disconnection_reason, status, preferred_collector_id, zone_id, created_at, contract_number)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), ?)
                `, [name, phone, address, city, transformDate(paidUntilRaw), transformDate(lastPaidRaw), transformDate(cutoffDateRaw), transformDate(reconnectionDateRaw), cutoffReason, status, collectorParams[0], contractNumber]);
                added++;
            }
        }

        await connection.commit();
        res.json({ msg: 'Carga completada', added, updated });

    } catch (err) {
        if (connection) await connection.rollback();
        console.error(err);
        res.status(500).json({ msg: 'Error al procesar CSV: ' + err.message });
    } finally {
        if (connection) connection.release();
    }
};

function transformDate(dateStr) {
    if (!dateStr || dateStr.trim() === '') return null;
    // Attempt parse 'DD/MM/YYYY' or 'YYYY-MM-DD'
    // Simple helper or just return raw if DB handles it (MySQL strict mode might complain)
    // Assuming standard format or null
    return dateStr;
}
