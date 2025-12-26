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
            whereClauses.push('c.status = ?');
            params.push(req.query.status);
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
        phone_primary, address_street,
        city_id, neighborhood_id, zone_id, // Added zone_id
        status,
        last_paid_month, last_payment_date, cutoff_date, reconnection_date, cutoff_reason,
        preferred_collector_id
    } = req.body;

    // TODO: extracting user id from request (middleware needed later)
    const userId = 1; // Default Admin for now until Auth is fully implemented

    try {
        let finalContract = contract_number;

        // Auto-Generate Contract if missing
        if (!finalContract) {
            const datePart = Date.now().toString().slice(-8); // Last 8 digits of timestamp
            const randomPart = Math.floor(1000 + Math.random() * 9000); // 4 random digits
            finalContract = `CTR-${datePart}${randomPart}`;
        }

        // Prevent duplicates
        if (finalContract) {
            const [existing] = await db.query('SELECT id FROM clients WHERE contract_number = ?', [finalContract]);
            if (existing.length > 0) {
                // Should we retry if auto-generated? Rare collision.
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
                phone_primary, address_street,
                city_id, neighborhood_id, zone_id,
                status,
                last_paid_month, last_payment_date, cutoff_date, reconnection_date, cutoff_reason,
                preferred_collector_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                finalContract, identity_document || null, full_name,
                phone_primary, address_street,
                city_id || 1, neighborhood_id || 1, zone_id || 1,
                status || 'active',
                last_paid_month || null, last_payment_date || null, cutoff_date || null, reconnection_date || null, cutoff_reason || null,
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
        phone_primary, address_street,
        city_id, neighborhood_id, zone_id,
        status,
        last_paid_month, last_payment_date, cutoff_date, reconnection_date, cutoff_reason,
        preferred_collector_id
    } = req.body;

    // TODO: Auth user ID
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

        // Format dates for comparison (naive approach)
        const normalizeDate = (d) => {
            if (!d) return null;
            // Handle MySQL Date Object or String
            const dateObj = new Date(d);
            // Use UTC methods to ensure we get the stored date 
            return dateObj.toISOString().split('T')[0];
        };

        // Track changes
        let changes = [];
        // Define fields to check
        const fieldsToCheck = [
            { key: 'full_name', label: 'Nombre Completo' },
            { key: 'identity_document', label: 'Cédula' },
            { key: 'phone_primary', label: 'Teléfono' },
            { key: 'address_street', label: 'Dirección' },
            { key: 'contract_number', label: 'Contrato' },
            { key: 'zone_id', label: 'Zona', isZone: true },
            { key: 'status', label: 'Estado', isStatus: true },
            { key: 'last_paid_month', label: 'Mes Pagado', isDate: true },
            { key: 'cutoff_date', label: 'Fecha Corte', isDate: true },
            { key: 'reconnection_date', label: 'Fecha Reconexión', isDate: true },
            { key: 'cutoff_reason', label: 'Motivo Corte' }
        ];

        // Incoming values map
        const incoming = {
            full_name, identity_document, phone_primary, address_street, contract_number,
            zone_id, status, last_paid_month, cutoff_date, reconnection_date, cutoff_reason
        };

        for (const field of fieldsToCheck) {
            const key = field.key;
            let oldVal = oldData[key];
            let newVal = incoming[key];

            // Normalize for comparison
            let sOld = oldVal;
            let sNew = newVal;

            if (field.isDate) {
                sOld = normalizeDate(oldVal); // "YYYY-MM-DD"
                sNew = normalizeDate(newVal); // "YYYY-MM-DD"
            } else {
                // Ensure strings/empty for non-dates
                sOld = sOld == null ? '' : String(sOld);
                sNew = sNew == null ? '' : String(sNew);
            }

            // Compare strings
            if (sNew !== sOld) {
                let friendlyOld = sOld;
                let friendlyNew = sNew;

                // Enrich names for display
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
                phone_primary=?, address_street=?,
                city_id=?, neighborhood_id=?, zone_id=?,
                status=?,
                last_paid_month=?, last_payment_date=?, cutoff_date=?, reconnection_date=?, cutoff_reason=?,
                preferred_collector_id=?
             WHERE id=?`,
            [
                contract_number || null, identity_document || null, full_name,
                phone_primary, address_street,
                city_id || 1, neighborhood_id || 1, zone_id || 1,
                status,
                last_paid_month || null, last_payment_date || null, cutoff_date || null, reconnection_date || null, cutoff_reason || null,
                preferred_collector_id || null,
                id
            ]
        );

        // Audit Log (Store JSON)
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
        const [techs] = await db.query("SELECT id, full_name, username FROM users WHERE role IN ('technician', 'admin')");
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
