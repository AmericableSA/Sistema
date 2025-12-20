import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

import { API_URL } from '../service/api';

const InventoryHistory = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTransactions();
    }, []);

    const fetchTransactions = async () => {
        try {
            const response = await fetch(`${API_URL}/transactions`);
            const data = await response.json();
            setTransactions(data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching transactions:", error);
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('es-NI', { timeZone: 'America/Managua' });
    };

    return (
        <div className="page-container">
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem', gap: '1rem' }}>
                <Link to="/inventory" className="btn-primary" style={{
                    textDecoration: 'none',
                    background: 'white',
                    color: 'var(--color-secondary-dark)',
                    border: '1px solid #CBD5E1',
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.5rem 1rem'
                }}>
                    <span>⬅️</span> Volver al Inventario
                </Link>
                <h2 style={{ fontFamily: 'var(--font-family-heading)', color: 'var(--color-secondary-dark)', margin: 0 }}>Historial de Movimientos</h2>
            </div>

            <div className="card" style={{ overflowX: 'auto', padding: 0, border: 'none' }}>
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0' }}>
                    <thead>
                        <tr style={{ background: 'var(--color-background-subtle)' }}>
                            <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #E2E8F0' }}>Fecha</th>
                            <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #E2E8F0' }}>Producto</th>
                            <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #E2E8F0' }}>Tipo</th>
                            <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #E2E8F0' }}>Cantidad</th>
                            <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #E2E8F0' }}>Razón/Detalle</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center' }}>Cargando historial...</td></tr>
                        ) : transactions.length === 0 ? (
                            <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center' }}>No hay movimientos registrados.</td></tr>
                        ) : transactions.map((t, index) => (
                            <tr key={t.id} style={{ backgroundColor: index % 2 === 0 ? 'white' : 'var(--color-background-surface)' }}>
                                <td data-label="Fecha" style={{ padding: '1rem', borderBottom: '1px solid #F1F5F9', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                                    {formatDate(t.created_at)}
                                </td>
                                <td data-label="Producto" style={{ padding: '1rem', borderBottom: '1px solid #F1F5F9', fontWeight: 600 }}>{t.product_name}</td>
                                <td data-label="Tipo" style={{ padding: '1rem', borderBottom: '1px solid #F1F5F9' }}>
                                    <span style={{
                                        padding: '4px 10px',
                                        borderRadius: '20px',
                                        fontSize: '0.8rem',
                                        fontWeight: 700,
                                        backgroundColor: t.transaction_type === 'IN' ? '#DCFCE7' : t.transaction_type === 'OUT' ? '#FEE2E2' : '#DBEAFE',
                                        color: t.transaction_type === 'IN' ? '#166534' : t.transaction_type === 'OUT' ? '#991B1B' : '#1E40AF'
                                    }}>
                                        {t.transaction_type === 'IN' ? 'ENTRADA' : t.transaction_type === 'OUT' ? 'SALIDA' : 'EDICIÓN'}
                                    </span>
                                </td>
                                <td data-label="Cantidad" style={{ padding: '1rem', borderBottom: '1px solid #F1F5F9', fontWeight: 700 }}>
                                    {t.transaction_type === 'IN' ? '+' : '-'}{t.quantity}
                                </td>
                                <td data-label="Razón" style={{ padding: '1rem', borderBottom: '1px solid #F1F5F9', color: 'var(--color-text-muted)' }}>{t.reason}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default InventoryHistory;
