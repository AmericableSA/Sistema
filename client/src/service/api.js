import axios from 'axios';

// Use environment variable or fallback to localhost
export const API_URL = import.meta.env.VITE_API_URL || '/api';

export const fetchProviderInvoices = async (token) => {
    const res = await axios.get(`${API_URL}/invoices`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    // Map backend (English) -> Frontend (Spanish expectations)
    // The frontend code expects:
    // id, proveedor, numero_factura, fecha_emision, fecha_vencimiento, monto_total, monto_abonado
    return res.data.map(inv => ({
        id: inv.id,
        proveedor: inv.provider_name,
        numero_factura: inv.reference_number,
        fecha_emision: inv.issue_date || inv.created_at,
        fecha_vencimiento: inv.due_date,
        monto_total: inv.amount,
        monto_abonado: inv.amount - inv.balance,
        // Frontend calculates status locally, but we pass backend status too just in case
        estado: inv.balance <= 0.1 ? 'PAGADA' : inv.status,
        referencia_pago: inv.notes // or map from somewhere else if needed
    }));
};

export const createProviderInvoice = async (data, token) => {
    // Map Frontend (Spanish) -> Backend (English)
    const payload = {
        provider_id: data.proveedor, // We will fix frontend to send ID here
        reference_number: data.numero_factura,
        amount: data.monto_total,
        issue_date: data.fecha_emision,
        due_date: data.fecha_vencimiento,
        description: data.notas || "Sin descripción"
    };
    return await axios.post(`${API_URL}/invoices`, payload, {
        headers: { Authorization: `Bearer ${token}` }
    });
};

export const payProviderInvoice = async (id, amount, reference, newStatus, token) => {
    return await axios.post(`${API_URL}/invoices/${id}/pay`, {
        amount,
        reference_number: reference,
        notes: "Abono desde Facturas"
    }, {
        headers: { Authorization: `Bearer ${token}` }
    });
};

export const deleteProviderInvoice = async (id, token) => {
    return await axios.delete(`${API_URL}/invoices/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
};
export const createProvider = async (data, token) => {
    // Map Frontend to Backend (which expects Spanish fields now)
    return await axios.post(`${API_URL}/providers`, data, {
        headers: { Authorization: `Bearer ${token}` }
    });
};

