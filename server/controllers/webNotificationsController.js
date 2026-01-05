const db = require('../config/db');

// --- AVERIAS ---

exports.getAverias = async (req, res) => {
    try {
        const { status, startDate, endDate } = req.query;
        let query = 'SELECT * FROM averias';
        let params = [];
        let conditions = [];

        if (status && status !== 'all') {
            conditions.push('estado = ?');
            params.push(status);
        }

        if (startDate && endDate) {
            conditions.push('DATE(fecha_reporte) BETWEEN ? AND ?');
            params.push(startDate, endDate);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY fecha_reporte DESC';

        const [rows] = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

exports.resolveAveria = async (req, res) => {
    // Used when converting to Service Order or manual close
    const { id } = req.params;
    const { status } = req.body; // 'Atendido', 'En Proceso', 'Convertido'

    try {
        await db.query('UPDATE averias SET estado = ? WHERE id = ?', [status, id]);
        res.json({ msg: 'Estado de avería actualizado' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

exports.exportAveriasXLS = async (req, res) => {
    try {
        const ExcelJS = require('exceljs');
        const [rows] = await db.query('SELECT * FROM averias ORDER BY fecha_reporte DESC');

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Averías');

        worksheet.columns = [
            { header: 'ID', key: 'id', width: 10 },
            { header: 'Nombre', key: 'nombre_completo', width: 30 },
            { header: 'Teléfono', key: 'telefono_contacto', width: 15 },
            { header: 'Zona/Barrio', key: 'zona_barrio', width: 25 },
            { header: 'Detalle', key: 'detalles_averia', width: 40 },
            { header: 'Fecha', key: 'fecha_reporte', width: 20 },
            { header: 'Estado', key: 'estado', width: 15 }
        ];

        worksheet.getRow(1).font = { bold: true };

        rows.forEach(r => {
            worksheet.addRow({
                ...r,
                fecha_reporte: new Date(r.fecha_reporte).toLocaleString()
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="Averias_Web.xlsx"');

        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error(err);
        res.status(500).send('Error exportando excel');
    }
};

// --- CONTACTOS ---

exports.getContactos = async (req, res) => {
    try {
        const { status } = req.query; // 'pending', 'attended', 'all'
        let query = `
            SELECT c.*, u.username as assigned_user 
            FROM contactos c
            LEFT JOIN users u ON c.assigned_user_id = u.id
        `;
        let params = [];
        let where = [];

        if (status === 'pending') where.push('c.atendido = 0');
        if (status === 'attended') where.push('c.atendido = 1');

        if (where.length > 0) query += ' WHERE ' + where.join(' AND ');

        query += ' ORDER BY c.fecha_contacto DESC';

        const [rows] = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

exports.assignContact = async (req, res) => {
    const { id } = req.params;
    const { user_id } = req.body;

    try {
        await db.query('UPDATE contactos SET assigned_user_id = ? WHERE id = ?', [user_id, id]);
        res.json({ msg: 'Usuario asignado' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

exports.toggleContactStatus = async (req, res) => {
    const { id } = req.params;
    const { atendido } = req.body; // true/false

    try {
        await db.query('UPDATE contactos SET atendido = ? WHERE id = ?', [atendido, id]);
        res.json({ msg: 'Estado de contacto actualizado' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

exports.exportContactosXLS = async (req, res) => {
    try {
        const ExcelJS = require('exceljs');
        const [rows] = await db.query(`
            SELECT c.*, u.username as assigned_user 
            FROM contactos c
            LEFT JOIN users u ON c.assigned_user_id = u.id
            ORDER BY c.fecha_contacto DESC
        `);

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Contactos');

        worksheet.columns = [
            { header: 'ID', key: 'id', width: 10 },
            { header: 'Nombre', key: 'nombre_completo', width: 30 },
            { header: 'Teléfono', key: 'telefono_whatsapp', width: 15 },
            { header: 'Dirección', key: 'barrio_direccion', width: 25 },
            { header: 'Mensaje', key: 'mensaje', width: 40 },
            { header: 'Fecha', key: 'fecha_contacto', width: 20 },
            { header: 'Estado', key: 'status_text', width: 15 },
            { header: 'Asignado A', key: 'assigned_user', width: 15 }
        ];

        worksheet.getRow(1).font = { bold: true };

        rows.forEach(r => {
            worksheet.addRow({
                ...r,
                fecha_contacto: new Date(r.fecha_contacto).toLocaleString(),
                status_text: r.atendido ? 'Atendido' : 'Pendiente',
                assigned_user: r.assigned_user || 'Sin Asignar'
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="Contactos_Web.xlsx"');

        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error(err);
        res.status(500).send('Error exportando excel');
    }
};

exports.deleteAveria = async (req, res) => {
    try {
        await db.query('DELETE FROM averias WHERE id = ?', [req.params.id]);
        res.json({ msg: 'Avería eliminada' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

exports.deleteContacto = async (req, res) => {
    try {
        await db.query('DELETE FROM contactos WHERE id = ?', [req.params.id]);
        res.json({ msg: 'Contacto eliminado' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

