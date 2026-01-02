const db = require('../config/db');

// --- List Clients (with Pagination) ---
// --- List Clients (with Pagination & Filters) ---
// --- List Clients (with Pagination & Filters) ---
exports.getClients = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 100;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';
        const start_letter = req.query.start_letter || '';

        // Build Where Clause (Use c. prefix to avoid ambiguity with joined tables like 'users')
        let whereClauses = [];
        let params = [];

        if (search) {
            const like = `%${search}%`;
            whereClauses.push('(c.full_name LIKE ? OR c.identity_document LIKE ? OR c.contract_number LIKE ?)');
            params.push(like, like, like);
        }

        if (start_letter) {
            whereClauses.push('c.full_name LIKE ?');
            params.push(`${start_letter}%`);
        }

        if (req.query.status && req.query.status !== 'all') {
            if (req.query.status === 'up_to_date') {
                // Active clients who paid current month or future
                whereClauses.push("c.status = 'active' AND c.last_paid_month >= DATE_FORMAT(CURDATE(), '%Y-%m-01')");
            } else if (req.query.status === 'in_arrears') {
                // Active clients who have NOT paid current month
                whereClauses.push("c.status = 'active' AND c.last_paid_month < DATE_FORMAT(CURDATE(), '%Y-%m-01')");
            } else {
                // Standard Status
                whereClauses.push('c.status = ?');
                params.push(req.query.status);
            }
        }

        const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

        // 1. Get Total Count (Filtered)
        // MUST alias clients as 'c' because whereSql uses 'c.' prefixes
        const [countBox] = await db.query(`SELECT COUNT(*) as total FROM clients c ${whereSql}`, params);
        const total = countBox[0].total;
        const totalPages = Math.ceil(total / limit);

        // 2. Get Paginated Data
        const [rows] = await db.query(`
            SELECT c.*, 
                   cities.name as city_name, 
                   neighborhoods.name as neighborhood_name,
                   u.full_name as collector_name,
                   z.name as zone_name,
                   z.tariff as zone_tariff
            FROM clients c
            LEFT JOIN cities ON c.city_id = cities.id
            LEFT JOIN neighborhoods ON c.neighborhood_id = neighborhoods.id
            LEFT JOIN users u ON c.preferred_collector_id = u.id
            LEFT JOIN zones z ON c.zone_id = z.id
            ${whereSql}
            ORDER BY c.full_name ASC
            LIMIT ? OFFSET ?
        `, [...params, limit, offset]);

        return res.json({ clients: rows, total, totalPages, currentPage: page });

    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// --- Get Client History ---
exports.getClientHistory = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.query(`
            SELECT l.*, u.username 
            FROM client_logs l
            LEFT JOIN users u ON l.user_id = u.id
            WHERE l.client_id = ?
            ORDER BY l.timestamp DESC
        `, [id]);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// --- Get Global History ---
exports.getGlobalHistory = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT l.*, u.username, c.full_name as client_name
            FROM client_logs l
            LEFT JOIN users u ON l.user_id = u.id
            LEFT JOIN clients c ON l.client_id = c.id
            ORDER BY l.timestamp DESC
            LIMIT 100
        `);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// --- Create Client ---
exports.createClient = async (req, res) => {
    const {
        contract_number, identity_document, full_name,
        phone_primary, phone_secondary, address_street, // Added phone_secondary
        city_id, neighborhood_id, zone_id,
        status,
        last_paid_month, last_payment_date, cutoff_date, reconnection_date, cutoff_reason,
        installation_date,
        preferred_collector_id
    } = req.body;

    const userId = 1;

    try {
        let finalContract = contract_number;

        // Auto-Generate Contract if missing
        if (!finalContract) {
            const datePart = Date.now().toString().slice(-8);
            const randomPart = Math.floor(1000 + Math.random() * 9000);
            finalContract = `CTR-${datePart}${randomPart}`;
        }

        // Prevent duplicates
        if (finalContract) {
            const [existing] = await db.query('SELECT id FROM clients WHERE contract_number = ?', [finalContract]);
            if (existing.length > 0) {
                return res.status(400).json({ msg: 'Número de contrato ya existe (Intenta de nuevo)' });
            }
        }
        if (identity_document) {
            const [existingID] = await db.query('SELECT id FROM clients WHERE identity_document = ?', [identity_document]);
            if (existingID.length > 0) return res.status(400).json({ msg: 'Cédula ya registrada' });
        }

        const [result] = await db.query(
            `INSERT INTO clients (
                contract_number, identity_document, full_name,
                phone_primary, phone_secondary, address_street, 
                city_id, neighborhood_id, zone_id,
                status,
                last_paid_month, last_payment_date, cutoff_date, reconnection_date, cutoff_reason,
                installation_date,
                preferred_collector_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                finalContract, identity_document || null, full_name,
                phone_primary, phone_secondary || null, address_street,
                city_id || 1, neighborhood_id || 1, zone_id || 1,
                status || 'active',
                last_paid_month || null, last_payment_date || null, cutoff_date || null, reconnection_date || null, cutoff_reason || null,
                installation_date || null,
                preferred_collector_id || null
            ]
        );

        // Audit Log
        const clientId = result.insertId;
        await db.query(
            'INSERT INTO client_logs (client_id, user_id, action, details) VALUES (?, ?, ?, ?)',
            [clientId, userId, 'CREATE', `Cliente creado: ${full_name}`]
        );

        res.json({ id: clientId, msg: 'Cliente registrado exitosamente' });

    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// --- Update Client ---
exports.updateClient = async (req, res) => {
    const { id } = req.params;
    const {
        contract_number, identity_document, full_name,
        phone_primary, phone_secondary, address_street,
        city_id, neighborhood_id, zone_id,
        status,
        last_paid_month, last_payment_date, cutoff_date, reconnection_date, cutoff_reason,
        installation_date,
        preferred_collector_id
    } = req.body;

    const userId = 1;

    try {
        // Get old values for comparison
        const [oldRows] = await db.query(`
            SELECT c.*, z.name as zone_name 
            FROM clients c 
            LEFT JOIN zones z ON c.zone_id = z.id
            WHERE c.id = ?
        `, [id]);

        if (oldRows.length === 0) return res.status(404).json({ msg: 'Cliente no encontrado' });
        const oldData = oldRows[0];

        // Fetch New Zone Name if changed
        let newZoneName = '';
        if (zone_id && zone_id != oldData.zone_id) {
            const [zRows] = await db.query('SELECT name FROM zones WHERE id = ?', [zone_id]);
            if (zRows.length > 0) newZoneName = zRows[0].name;
        }

        const statusMap = {
            'active': 'Activo',
            'suspended': 'Cortado',
            'disconnected': 'Retirado',
            'pending_install': 'Pendiente'
        };

        const normalizeDate = (d) => {
            if (!d) return null;
            const dateObj = new Date(d);
            return dateObj.toISOString().split('T')[0];
        };

        let changes = [];
        const fieldsToCheck = [
            { key: 'full_name', label: 'Nombre Completo' },
            { key: 'identity_document', label: 'Cédula' },
            { key: 'phone_primary', label: 'Teléfono' },
            { key: 'phone_secondary', label: 'Teléfono Adicional' },
            { key: 'address_street', label: 'Dirección' },
            { key: 'contract_number', label: 'Contrato' },
            { key: 'zone_id', label: 'Zona', isZone: true },
            { key: 'status', label: 'Estado', isStatus: true },
            { key: 'last_paid_month', label: 'Mes Pagado', isDate: true },
            { key: 'cutoff_date', label: 'Fecha Corte', isDate: true },
            { key: 'reconnection_date', label: 'Fecha Reconexión', isDate: true },
            { key: 'installation_date', label: 'Fecha Instalación', isDate: true },
            { key: 'cutoff_reason', label: 'Motivo Corte' }
        ];

        const incoming = {
            full_name, identity_document, phone_primary, phone_secondary, address_street, contract_number,
            zone_id, status, last_paid_month, cutoff_date, reconnection_date, cutoff_reason,
            installation_date
        };

        for (const field of fieldsToCheck) {
            const key = field.key;
            let oldVal = oldData[key];
            let newVal = incoming[key];

            let sOld = oldVal;
            let sNew = newVal;

            if (field.isDate) {
                sOld = normalizeDate(oldVal);
                sNew = normalizeDate(newVal);
            } else {
                sOld = sOld == null ? '' : String(sOld);
                sNew = sNew == null ? '' : String(sNew);
            }

            if (sNew !== sOld) {
                let friendlyOld = sOld;
                let friendlyNew = sNew;

                if (field.isZone) {
                    friendlyOld = oldData.zone_name || 'Sin Zona';
                    friendlyNew = newZoneName || 'Sin Zona';
                }
                if (field.isStatus) {
                    friendlyOld = statusMap[oldVal] || oldVal;
                    friendlyNew = statusMap[newVal] || newVal;
                }
                if (field.isDate) {
                    const toFriendlyDate = (iso) => iso ? iso.split('-').reverse().join('/') : 'N/A';
                    friendlyOld = toFriendlyDate(sOld);
                    friendlyNew = toFriendlyDate(sNew);
                }

                changes.push({
                    field: field.label,
                    old: friendlyOld || 'Vacío',
                    new: friendlyNew || 'Vacío'
                });
            }
        }

        await db.query(
            `UPDATE clients SET 
                contract_number=?, identity_document=?, full_name=?,
                phone_primary=?, phone_secondary=?, address_street=?,
                city_id=?, neighborhood_id=?, zone_id=?,
                status=?,
                last_paid_month=?, last_payment_date=?, cutoff_date=?, reconnection_date=?, cutoff_reason=?,
                installation_date=?,
                preferred_collector_id=?
             WHERE id=?`,
            [
                contract_number || null, identity_document || null, full_name,
                phone_primary, phone_secondary || null, address_street,
                city_id || 1, neighborhood_id || 1, zone_id || 1,
                status,
                last_paid_month || null, last_payment_date || null, cutoff_date || null, reconnection_date || null, cutoff_reason || null,
                installation_date || null,
                preferred_collector_id || null,
                id
            ]
        );

        if (changes.length > 0) {
            await db.query(
                'INSERT INTO client_logs (client_id, user_id, action, details) VALUES (?, ?, ?, ?)',
                [id, userId, 'UPDATE', JSON.stringify(changes)]
            );
        }

        res.json({ msg: 'Cliente actualizado' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// --- Delete Client ---
exports.deleteClient = async (req, res) => {
    const { id } = req.params;
    const userId = 1;
    try {
        // Log delete before deleting (if soft delete preferred, but here we hard delete so maybe log globally? 
        // Or keep logs and cascade? Schema said cascade logs. 
        // Real-world: Don't hard delete clients usually. But user asked for delete. 
        // We can't log to client_logs if client row is gone due to FK Cascade.
        // We will just delete for now.)
        await db.query('DELETE FROM clients WHERE id = ?', [id]);
        res.json({ msg: 'Cliente eliminado' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// --- SERVICE ORDERS ---

// --- Service Orders (Existing) ---
exports.getServiceOrders = async (req, res) => {
    try {
        const [orders] = await db.query(`
            SELECT so.*, u.username as tech_name, u.full_name as tech_full_name
            FROM service_orders so
            LEFT JOIN users u ON so.assigned_tech_id = u.id
            WHERE so.client_id = ?
            ORDER BY so.created_at DESC
        `, [req.params.id]);
        res.json(orders);
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
};

// --- NEW: Client Transactions (Invoices) ---
exports.getClientTransactions = async (req, res) => {
    try {
        // Use collector_id to show who is responsible/credited for the payment
        const [txs] = await db.query(`
            SELECT t.id, t.amount, t.details_json, t.created_at, t.reference_id, t.description, t.type,
                   u.username as collector_username, u.full_name as collector_name
            FROM transactions t
            LEFT JOIN users u ON t.collector_id = u.id
            WHERE t.client_id = ?
            ORDER BY t.created_at DESC
        `, [req.params.id]);
        res.json(txs);
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Error al obtener facturas: ' + err.message });
    }
};

exports.updateServiceOrder = async (req, res) => {
    const { orderId } = req.params;
    const { assigned_tech_id, status, notes } = req.body;

    try {
        await db.query(`
            UPDATE service_orders 
            SET assigned_tech_id = ?, status = ?, technician_notes = ?
            WHERE id = ?
        `, [assigned_tech_id || null, status, notes || null, orderId]);

        // LOGGING ON COMPLETION
        if (status === 'COMPLETED') {
            // Fetch Order Details for Log
            const [oRows] = await db.query(`
                SELECT so.client_id, u.full_name as tech_name 
                FROM service_orders so
                LEFT JOIN users u ON so.assigned_tech_id = u.id
                WHERE so.id = ?
            `, [orderId]);

            if (oRows.length > 0) {
                const order = oRows[0];
                const techName = order.tech_name || 'Sin Asignar';
                // Log to history
                await db.query(
                    'INSERT INTO client_logs (client_id, user_id, action, details) VALUES (?, ?, ?, ?)',
                    [order.client_id, 1, 'SERVICE_COMPLETED', `Visita/Instalación Finalizada. Técnico: ${techName}. Notas: ${notes || 'Ninguna'}`]
                );
            }
        }

        res.json({ msg: 'Orden actualizada' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

exports.createManualServiceOrder = async (req, res) => {
    const { id } = req.params; // Client ID
    const { type, description } = req.body;
    const userId = 1; // Default Admin

    try {
        await db.query(`
            INSERT INTO service_orders (client_id, type, status, created_by_user_id, technician_notes)
            VALUES (?, ?, 'PENDING', ?, ?)
        `, [id, type || 'REPAIR', userId, description || 'Solicitud Manual desde Caja']);

        res.json({ msg: 'Orden creada exitosamente' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

exports.getTechnicians = async (req, res) => {
    try {
        // User requested ONLY 'technician' or 'collector' in this list (removing admin)
        const [techs] = await db.query("SELECT id, full_name, username FROM users WHERE role IN ('technician', 'collector')");
        res.json(techs);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

exports.registerMovement = async (req, res) => {
    const { client_id, type, details } = req.body;
    const userId = 1; // Default Admin

    try {
        await db.query(
            'INSERT INTO client_logs (client_id, user_id, action, details) VALUES (?, ?, ?, ?)',
            [client_id, userId, type, details || '']
        );
        res.json({ msg: 'Movimiento registrado' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// --- NOTES FEATURE ---
exports.getClientNotes = async (req, res) => {
    try {
        const [notes] = await db.query(
            'SELECT * FROM client_notes WHERE client_id = ? ORDER BY created_at DESC',
            [req.params.id]
        );
        res.json(notes);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

exports.createClientNote = async (req, res) => {
    const { note_content } = req.body;
    try {
        await db.query(
            'INSERT INTO client_notes (client_id, note_content) VALUES (?, ?)',
            [req.params.id, note_content]
        );
        res.json({ msg: 'Nota agregada' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

exports.updateClientNote = async (req, res) => {
    const { note_content } = req.body;
    try {
        await db.query(
            'UPDATE client_notes SET note_content = ? WHERE id = ?',
            [note_content, req.params.noteId]
        );
        res.json({ msg: 'Nota actualizada' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

exports.deleteClientNote = async (req, res) => {
    try {
        await db.query('DELETE FROM client_notes WHERE id = ?', [req.params.noteId]);
        res.json({ msg: 'Nota eliminada' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// --- Export Clients XLS ---
exports.exportClientsXLS = async (req, res) => {
    try {
        const search = req.query.search || '';
        const start_letter = req.query.start_letter || '';

        // Replicating Filter Logic strictly for Export
        let whereClauses = [];
        let params = [];

        if (search) {
            const like = `%${search}%`;
            whereClauses.push('(c.full_name LIKE ? OR c.identity_document LIKE ? OR c.contract_number LIKE ?)');
            params.push(like, like, like);
        }

        if (start_letter) {
            whereClauses.push('c.full_name LIKE ?');
            params.push(`${start_letter}%`);
        }

        if (req.query.status && req.query.status !== 'all') {
            if (req.query.status === 'up_to_date') {
                whereClauses.push("c.status = 'active' AND c.last_paid_month >= DATE_FORMAT(CURDATE(), '%Y-%m-01')");
            } else if (req.query.status === 'in_arrears') {
                whereClauses.push("c.status = 'active' AND c.last_paid_month < DATE_FORMAT(CURDATE(), '%Y-%m-01')");
            } else {
                whereClauses.push('c.status = ?');
                params.push(req.query.status);
            }
        }

        const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

        // Safely Query Data (Explicit Columns)
        const [rows] = await db.query(`
            SELECT c.contract_number, c.full_name, c.identity_document, c.phone_primary, c.address_street, c.last_paid_month, c.status,
                   z.name as zone_name
            FROM clients c
            LEFT JOIN zones z ON c.zone_id = z.id
            ${whereSql}
            ORDER BY c.full_name ASC
        `, params);

        // Generate HTML Table for Excel
        let htmlNode = `
            <html xmlns:x="urn:schemas-microsoft-com:office:excel">
            <head>
                <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
            </head>
            <body>
                <table border="1">
                    <thead>
                        <tr style="background-color: #cccccc;">
                            <th>Contrato</th>
                            <th>Nombre Completo</th>
                            <th>Cédula</th>
                            <th>Teléfono</th>
                            <th>Dirección</th>
                            <th>Zona</th>
                            <th>Estado</th>
                            <th>Último Mes Pagado</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        for (const c of rows) {
            let lastPaid = 'N/A';
            try {
                if (c.last_paid_month) {
                    const d = new Date(c.last_paid_month);
                    if (!isNaN(d.getTime())) {
                        const day = String(d.getDate()).padStart(2, '0');
                        const month = String(d.getMonth() + 1).padStart(2, '0');
                        const year = d.getFullYear();
                        lastPaid = `${day}/${month}/${year}`;
                    } else {
                        // Handle '0000-00-00' strings or valid non-date strings
                        lastPaid = String(c.last_paid_month);
                    }
                }
            } catch (e) { lastPaid = 'Error Fecha'; }

            const statusLabel =
                c.status === 'active' ? 'Activo' :
                    c.status === 'suspended' ? 'Cortado' :
                        c.status === 'disconnected' ? 'Retirado' : c.status;

            htmlNode += `
                <tr>
                    <td style="mso-number-format:'@'">${c.contract_number || ''}</td>
                    <td>${c.full_name || ''}</td>
                    <td style="mso-number-format:'@'">${c.identity_document || ''}</td>
                    <td style="mso-number-format:'@'">${c.phone_primary || ''}</td>
                    <td>${c.address_street || ''}</td>
                    <td>${c.zone_name || ''}</td>
                    <td>${statusLabel}</td>
                    <td>${lastPaid}</td>
                </tr>
            `;
        }

        htmlNode += `
                    </tbody>
                </table>
            </body>
            </html>
        `;

        res.setHeader('Content-Type', 'application/vnd.ms-excel');
        res.setHeader('Content-Disposition', 'attachment; filename="Reporte_Clientes.xls"');
        res.send(htmlNode);

    } catch (err) {
        console.error(err);
        res.status(500).send('Error exportando excel: ' + (err.message || 'Desconocido'));
    }
};
