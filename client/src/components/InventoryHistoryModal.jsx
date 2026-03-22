
import React, { useState, useEffect, useCallback } from 'react';

const InventoryHistoryModal = ({ onClose }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const fetchHistory = useCallback(() => {
        setLoading(true);
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);

        fetch(`/api/products/history/all?${params.toString()}`)
            .then(r => r.json())
            .then(data => {
                setHistory(data);
                setLoading(false);
            })
            .catch(e => {
                console.error(e);
                setLoading(false);
            });
    }, [startDate, endDate]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const filteredHistory = history.filter(h => h.product_name?.toLowerCase().includes(searchTerm.toLowerCase()));

    // Generate period summary if a specific product is searched
    let periodSummary = null;
    if (searchTerm.trim() !== '' && filteredHistory.length > 0) {
        const totals = { in: 0, out: 0 };
        filteredHistory.forEach(item => {
            const qty = Math.abs(item.quantity || 0);
            if (item.transaction_type === 'IN') {
                totals.in += qty;
            } else if (item.transaction_type === 'OUT') {
                totals.out += qty;
            } else {
                if (item.quantity > 0) totals.in += qty;
                else if (item.quantity < 0) totals.out += qty;
            }
        });
        
        let label = 'Todos los tiempos';
        if (startDate && endDate) label = `${startDate.split('-').reverse().join('/')} - ${endDate.split('-').reverse().join('/')}`;
        else if (startDate) label = `Desde ${startDate.split('-').reverse().join('/')}`;
        else if (endDate) label = `Hasta ${endDate.split('-').reverse().join('/')}`;

        periodSummary = { label, ...totals };
    }

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200
        }}>
            <div className="glass-card" style={{ width: '900px', maxHeight: '85vh', height: '85vh', display: 'flex', flexDirection: 'column', background: '#0f172a', border: '1px solid #334155' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', borderBottom: '1px solid #334155', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h3 style={{ margin: 0, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>🕒 Historial de Movimientos</h3>
                        <p style={{ margin: '0.2rem 0 0 0', color: '#94a3b8', fontSize: '0.9rem' }}>Registro completo de entradas, salidas y ajustes.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="input-dark"
                                style={{ padding: '0.5rem', color: '#94a3b8', fontSize: '0.9rem' }}
                                title="Fecha Inicio"
                            />
                            <span style={{ color: '#64748b' }}>-</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="input-dark"
                                style={{ padding: '0.5rem', color: '#94a3b8', fontSize: '0.9rem' }}
                                title="Fecha Fin"
                            />
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar producto..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input-dark"
                            style={{ padding: '0.5rem 1rem', width: '250px' }}
                        />
                        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
                    </div>
                </div>

                {periodSummary && (
                    <div style={{ padding: '1.5rem', borderBottom: '1px solid #334155', background: 'rgba(30, 41, 59, 0.5)' }}>
                        <h4 style={{ margin: '0 0 1rem 0', color: '#e2e8f0', fontSize: '1rem' }}>📊 Resumen del Periodo: <span style={{color: '#94a3b8'}}>{periodSummary.label}</span></h4>
                        <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                            <div style={{ 
                                background: '#1e293b', padding: '1rem', borderRadius: '8px', minWidth: '250px',
                                border: '1px solid rgba(255,255,255,0.05)'
                            }}>
                                <div style={{ color: '#94a3b8', fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '0.9rem' }}>{searchTerm.toUpperCase()}</div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                    <span style={{ color: '#4ade80' }}>Ingresos: +{periodSummary.in}</span>
                                    <span style={{ color: '#f87171' }}>Salidas: -{periodSummary.out}</span>
                                </div>
                                <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: '0.85rem', color: '#cbd5e1', textAlign: 'right' }}>
                                    Diferencia: <span style={{ color: periodSummary.in - periodSummary.out >= 0 ? '#4ade80' : '#f87171', fontWeight: 'bold' }}>
                                        {periodSummary.in - periodSummary.out > 0 ? '+' : ''}{periodSummary.in - periodSummary.out}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div style={{ flex: 1, overflowY: 'auto', padding: '0' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ position: 'sticky', top: 0, background: '#1e293b' }}>
                            <tr>
                                <th style={{ textAlign: 'left', padding: '1rem', color: '#94a3b8' }}>Fecha</th>
                                <th style={{ textAlign: 'left', padding: '1rem', color: '#94a3b8' }}>Producto</th>
                                <th style={{ textAlign: 'center', padding: '1rem', color: '#94a3b8' }}>Tipo</th>
                                <th style={{ textAlign: 'right', padding: '1rem', color: '#94a3b8' }}>Cant.</th>
                                <th style={{ textAlign: 'left', padding: '1rem', color: '#94a3b8' }}>Razón / Usuario</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>Cargando historial...</td></tr>
                            ) : filteredHistory.length === 0 ? (
                                <tr><td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>{searchTerm || startDate || endDate ? 'No se encontraron resultados.' : 'Sin movimientos registrados.'}</td></tr>
                            ) : filteredHistory.map((item, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '1rem', color: '#cbd5e1' }}>{new Date(item.created_at).toLocaleString()}</td>
                                    <td style={{ padding: '1rem', color: 'white', fontWeight: 500 }}>{item.product_name}</td>
                                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                                        <span style={{
                                            padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem',
                                            background: item.transaction_type === 'IN' ? 'rgba(34, 197, 94, 0.2)' :
                                                item.transaction_type === 'OUT' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                                            color: item.transaction_type === 'IN' ? '#4ade80' :
                                                item.transaction_type === 'OUT' ? '#f87171' : '#60a5fa'
                                        }}>
                                            {item.transaction_type}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'right', color: 'white', fontWeight: 700 }}>
                                        {item.quantity > 0 ? `+${item.quantity}` : item.quantity}
                                    </td>
                                    <td style={{ padding: '1rem', color: '#94a3b8' }}>
                                        {item.reason}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default InventoryHistoryModal;

