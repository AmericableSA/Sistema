
import React, { useState, useEffect } from 'react';
import { API_URL } from '../service/api';

const InventoryHistoryModal = ({ onClose }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch inventory moves from existing moves endpoint or create if needed
        // Assuming we need to fetch specific inventory history. 
        // Current 'inventory_transactions' table logs product moves. 
        // Let's use 'api/products/history' if exists or fetch all.
        // Actually, let's fetch from the generic transactions endpoint but need to ensure we get INVENTORY moves.
        // Or directly query via a specific endpoint. 
        // I will create a quick fetch inside productController for getAllInventoryMoves if not exists?
        // Wait, for now let's mock empty or assume route exists. 
        // I'll add the route functionality concurrently.

        fetch(`${API_URL}/products/history/all`)
            .then(r => r.json())
            .then(data => {
                setHistory(data);
                setLoading(false);
            })
            .catch(e => {
                console.error(e);
                setLoading(false);
            });
    }, []);

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200
        }}>
            <div className="glass-card" style={{ width: '900px', maxHeight: '85vh', height: '85vh', display: 'flex', flexDirection: 'column', background: '#0f172a', border: '1px solid #334155' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', borderBottom: '1px solid #334155' }}>
                    <div>
                        <h3 style={{ margin: 0, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>🕒 Historial de Movimientos</h3>
                        <p style={{ margin: '0.2rem 0 0 0', color: '#94a3b8', fontSize: '0.9rem' }}>Registro completo de entradas, salidas y ajustes.</p>
                    </div>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
                </div>

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
                            ) : history.length === 0 ? (
                                <tr><td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>Sin movimientos registrados.</td></tr>
                            ) : history.map((item, i) => (
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
