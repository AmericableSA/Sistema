import React, { useState, useEffect } from 'react';

const HistoryModal = ({ client, onClose, global = false, initialTab = 'logs' }) => {
    const [activeTab, setActiveTab] = useState(initialTab); // 'logs' | 'invoices'
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch Data based on active tab
    useEffect(() => {
        setLoading(true);
        let url = '';

        if (activeTab === 'logs') {
            url = global ? '/api/clients/history/global' : `/api/clients/${client?.id}/history`;
        } else if (activeTab === 'invoices' && client) {
            url = `/api/clients/${client.id}/transactions`;
        }

        if (url) {
            fetch(url)
                .then(res => res.json())
                .then(resData => {
                    // Safety Check: Ensure array
                    if (Array.isArray(resData)) {
                        setData(resData);
                    } else {
                        console.error("Expected array but got:", resData);
                        setData([]);
                    }
                    setLoading(false);
                })
                .catch(err => {
                    console.error(err);
                    setData([]); // Safety
                    setLoading(false);
                });
        }
    }, [client, global, activeTab]);

    return (
        <div className="modal-overlay">
            <div className="glass-card animate-entry" style={{ width: '900px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', background: '#0f172a' }}>

                {/* Header */}
                <div style={{ padding: '1.5rem', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3 style={{ margin: 0, color: 'white' }}>
                            {global ? 'HISTORIAL GLOBAL' : `HISTORIAL: ${client?.full_name?.toUpperCase()}`}
                        </h3>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
                </div>

                {/* Tabs */}
                {!global && (
                    <div style={{ display: 'flex', borderBottom: '1px solid #334155', padding: '0 1.5rem' }}>
                        <button
                            onClick={() => setActiveTab('logs')}
                            style={{
                                padding: '1rem', background: 'none', border: 'none',
                                color: activeTab === 'logs' ? '#60a5fa' : '#94a3b8',
                                borderBottom: activeTab === 'logs' ? '2px solid #60a5fa' : 'none',
                                cursor: 'pointer', fontWeight: 'bold'
                            }}
                        >
                            📋 Bitácora de Cambios
                        </button>
                        <button
                            onClick={() => setActiveTab('invoices')}
                            style={{
                                padding: '1rem', background: 'none', border: 'none',
                                color: activeTab === 'invoices' ? '#f59e0b' : '#94a3b8',
                                borderBottom: activeTab === 'invoices' ? '2px solid #f59e0b' : 'none',
                                cursor: 'pointer', fontWeight: 'bold'
                            }}
                        >
                            🧾 Historial de Facturas
                        </button>
                    </div>
                )}

                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
                    {loading && <div style={{ color: 'white', textAlign: 'center', padding: '2rem' }}>Cargando...</div>}

                    {!loading && activeTab === 'logs' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {data.length === 0 && <div style={{ color: '#64748b', textAlign: 'center' }}>No hay registros de cambios.</div>}
                            {data.map((log, idx) => (
                                <div key={log.id || idx} style={{
                                    padding: '1rem', background: '#1e293b', borderRadius: '8px',
                                    borderLeft: log.action === 'CREATE' ? '4px solid #4ade80' : (log.action === 'PAYMENT' ? '4px solid #f59e0b' : '4px solid #3b82f6')
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                            <span style={{ color: 'white', fontWeight: 'bold' }}>{log.action}</span>
                                            {global && <span style={{ color: '#60a5fa', fontSize: '0.9rem', background: 'rgba(96, 165, 250, 0.1)', padding: '0.1rem 0.5rem', borderRadius: '4px' }}>{log.client_name}</span>}
                                        </div>
                                        <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{new Date(log.timestamp).toLocaleString()}</span>
                                    </div>
                                    <div style={{ color: '#cbd5e1', fontSize: '0.95rem', background: '#0f172a', padding: '0.75rem', borderRadius: '4px' }}>
                                        <LogContent content={log.details} />
                                    </div>
                                    <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#64748b' }}>
                                        Por: {log.username || 'Sistema'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {!loading && activeTab === 'invoices' && (
                        <table style={{ width: '100%', borderCollapse: 'collapse', color: '#cbd5e1' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #334155', textAlign: 'left', color: '#94a3b8' }}>
                                    <th style={{ padding: '0.75rem' }}>Fecha</th>
                                    <th style={{ padding: '0.75rem' }}>No. Factura</th>
                                    <th style={{ padding: '0.75rem' }}>Tipo</th>
                                    <th style={{ padding: '0.75rem' }}>Descripción / Meses</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Monto</th>
                                    <th style={{ padding: '0.75rem' }}>Cobrado Por</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.length === 0 && <tr><td colSpan="6" style={{ padding: '2rem', textAlign: 'center' }}>No hay facturas registradas.</td></tr>}
                                {data.map((tx, idx) => {
                                    // Parse months if available
                                    let months = '1';
                                    if (tx.details_json) {
                                        try { const sc = typeof tx.details_json === 'string' ? JSON.parse(tx.details_json) : tx.details_json; months = sc.months_paid || '1'; } catch (e) { }
                                    }
                                    return (
                                        <tr key={tx.id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <td style={{ padding: '0.75rem' }}>{new Date(tx.created_at).toLocaleDateString()} {new Date(tx.created_at).toLocaleTimeString()}</td>
                                            <td style={{ padding: '0.75rem', color: '#f59e0b', fontWeight: 'bold' }}>{tx.reference_id || 'S/N'}</td>
                                            <td style={{ padding: '0.75rem' }}>{tx.type === 'monthly_fee' ? 'Mensualidad' : tx.type}</td>
                                            <td style={{ padding: '0.75rem' }}>
                                                <div>{tx.description}</div>
                                                <div style={{ fontSize: '0.8em', color: '#64748b' }}>({months} Meses)</div>
                                            </td>
                                            <td style={{ padding: '0.75rem', textAlign: 'right', color: '#4ade80', fontWeight: 'bold' }}>C$ {parseFloat(tx.amount).toFixed(2)}</td>
                                            <td style={{ padding: '0.75rem', fontSize: '0.9rem', color: '#94a3b8' }}>{tx.collector_username || 'Sistema'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}

                </div>
            </div>
        </div>
    );
};

// Helper to render log content (JSON or Text)
const LogContent = ({ content }) => {
    try {
        // Try parsing JSON
        const changes = JSON.parse(content);
        if (Array.isArray(changes)) {
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {changes.map((change, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                            <span style={{ color: '#94a3b8', fontWeight: '600', minWidth: '80px' }}>{change.field}:</span>
                            <span style={{ color: '#f87171', textDecoration: 'line-through', opacity: 0.7 }}>{change.old || 'Vacío'}</span>
                            <span style={{ color: '#64748b' }}>→</span>
                            <span style={{ color: '#4ade80', fontWeight: 'bold' }}>{change.new}</span>
                        </div>
                    ))}
                </div>
            );
        }
        return <span>{content}</span>;
    } catch (e) {
        // Fallback for old text logs
        return <span>{content}</span>;
    }
};

export default HistoryModal;

