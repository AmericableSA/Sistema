"""
patch_reportController.py
Aplica parches seguros a reportController.js:
1. Corrige filtros DATE() para usar CONVERT_TZ (Nicaragua UTC-6)
2. Agrega el endpoint getInvoicesByCollector al final (antes del último export)
"""
import re

filepath = r'c:\Users\Waskar\Desktop\AmericableS\server\controllers\reportController.js'

with open(filepath, 'r', encoding='utf-8-sig') as f:
    content = f.read()

# ── PATCH 1: Corregir DATE(created_at) BETWEEN → CONVERT_TZ ──
content = content.replace(
    "AND DATE(created_at) BETWEEN ? AND ?",
    "AND DATE(CONVERT_TZ(created_at, '+00:00', '-06:00')) BETWEEN ? AND ?"
)
content = content.replace(
    "AND DATE(t.created_at) BETWEEN ? AND ?",
    "AND DATE(CONVERT_TZ(t.created_at, '+00:00', '-06:00')) BETWEEN ? AND ?"
)

# Fix the inline string version too (single line)
content = re.sub(
    r"DATE\(CONVERT_TZ\(created_at, '([^']+)', '([^']+)'\)\) BETWEEN",
    r"DATE(CONVERT_TZ(created_at, '+00:00', '-06:00')) BETWEEN",
    content
)

# ── PATCH 2: Agregar getInvoicesByCollector al final ──
NEW_ENDPOINT = '''
// =====================================================================
// FACTURAS POR COBRADOR - Busqueda avanzada con filtros y paginacion
// =====================================================================
exports.getInvoicesByCollector = async (req, res) => {
    let conn;
    try {
        const {
            collectorId,
            startDate,
            endDate,
            invoiceNumber,
            clientSearch,
            page = 1,
            limit = 25
        } = req.query;

        conn = await db.getConnection();

        const conditions = ["t.type != 'void'"];
        const params = [];

        if (collectorId && collectorId !== '') {
            conditions.push('t.collector_id = ?');
            params.push(collectorId);
        }
        if (startDate && startDate !== '') {
            conditions.push("DATE(CONVERT_TZ(t.created_at, '+00:00', '-06:00')) >= ?");
            params.push(startDate);
        }
        if (endDate && endDate !== '') {
            conditions.push("DATE(CONVERT_TZ(t.created_at, '+00:00', '-06:00')) <= ?");
            params.push(endDate);
        }
        if (invoiceNumber && invoiceNumber !== '') {
            conditions.push('t.reference_id LIKE ?');
            params.push('%' + invoiceNumber + '%');
        }
        if (clientSearch && clientSearch !== '') {
            conditions.push('(c.full_name LIKE ? OR c.contract_number LIKE ?)');
            params.push('%' + clientSearch + '%', '%' + clientSearch + '%');
        }

        const whereClause = 'WHERE ' + conditions.join(' AND ');
        const pageNum  = Math.max(1, parseInt(page) || 1);
        const pageSize = Math.min(100, Math.max(10, parseInt(limit) || 25));
        const offset   = (pageNum - 1) * pageSize;

        const dataQuery = `
            SELECT
                t.id,
                COALESCE(NULLIF(TRIM(t.reference_id), ''), CONCAT('#', t.id)) AS numero_factura,
                t.created_at AS fecha,
                t.amount AS monto,
                t.payment_method AS metodo_pago,
                t.status AS estado,
                t.type AS tipo,
                t.description AS descripcion,
                t.cancellation_reason,
                COALESCE(c.full_name, '—') AS cliente,
                COALESCE(c.contract_number, '—') AS contrato,
                COALESCE(u.full_name, 'Sin Asignar') AS cobrador,
                COALESCE(u.username, 'sistema') AS usuario_cobrador,
                u.id AS cobrador_id,
                u.role AS cobrador_rol
            FROM transactions t
            LEFT JOIN clients c ON t.client_id = c.id
            LEFT JOIN users u ON t.collector_id = u.id
            ${whereClause}
            ORDER BY t.created_at DESC
            LIMIT ? OFFSET ?
        `;

        const countQuery = `
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN t.status != 'CANCELLED' THEN t.amount ELSE 0 END) AS total_monto,
                SUM(CASE WHEN t.status = 'CANCELLED' THEN 1 ELSE 0 END) AS total_canceladas,
                SUM(CASE WHEN t.status = 'CANCELLED' THEN t.amount ELSE 0 END) AS monto_cancelado
            FROM transactions t
            LEFT JOIN clients c ON t.client_id = c.id
            LEFT JOIN users u ON t.collector_id = u.id
            ${whereClause}
        `;

        const [rows]     = await conn.query(dataQuery, [...params, pageSize, offset]);
        const [countRes] = await conn.query(countQuery, params);

        const totalRows      = countRes[0].total || 0;
        const totalMonto     = parseFloat(countRes[0].total_monto || 0);
        const totalCanceladas = parseInt(countRes[0].total_canceladas || 0);
        const montoCancelado = parseFloat(countRes[0].monto_cancelado || 0);

        res.json({
            data: rows,
            pagination: {
                total: totalRows,
                page: pageNum,
                limit: pageSize,
                totalPages: Math.ceil(totalRows / pageSize)
            },
            summary: { totalMonto, totalCanceladas, montoCancelado, totalFacturas: totalRows }
        });

    } catch (err) {
        console.error('InvoicesByCollector Error:', err);
        res.status(500).json({ error: 'Error al consultar facturas' });
    } finally {
        if (conn) conn.release();
    }
};
'''

# Solo agregar si no existe ya
if 'getInvoicesByCollector' not in content:
    content = content.rstrip() + '\n' + NEW_ENDPOINT
    print('  ✅ Endpoint getInvoicesByCollector agregado')
else:
    # Reemplazar la función existente limpiamente
    # Eliminar cualquier versión corrupta y agregar la correcta
    # Busca desde el comentario hasta el siguiente exports.
    pattern = r'// ={5,}.*?FACTURAS POR COBRADOR.*?\n.*?exports\.getInvoicesByCollector[\s\S]*?^\};'
    if re.search(pattern, content, re.MULTILINE):
        content = re.sub(pattern, NEW_ENDPOINT.strip(), content, flags=re.MULTILINE)
        print('  ✅ Endpoint getInvoicesByCollector reemplazado')
    else:
        content = content.rstrip() + '\n' + NEW_ENDPOINT
        print('  ✅ Endpoint getInvoicesByCollector agregado (no se encontró versión anterior)')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print('  ✅ reportController.js guardado correctamente')
