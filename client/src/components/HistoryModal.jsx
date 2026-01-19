import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

const HistoryModal = ({ client, onClose, global = false, initialTab = 'logs' }) => {
    const { token, user } = useAuth();
    const [activeTab, setActiveTab] = useState(initialTab); // 'logs' | 'invoices'
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    // Cancel State
    const [cancelTxId, setCancelTxId] = useState(null);
    const [cancelReason, setCancelReason] = useState('');
    const [processing, setProcessing] = useState(false);

    // Fetch Data based on active tab
    const fetchData = useCallback(() => {
        setLoading(true);
        let url = '';

        if (activeTab === 'logs') {
            url = global ? '/api/clients/history/global' : `/api/clients/${client?.id}/history`;
        } else if (activeTab === 'invoices' && client) {
            url = `/api/clients/${client.id}/transactions`;
        }

        if (url) {
            // Add Auth Header just in case (though existing code didn't use it, better safe)
            fetch(url, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            })
                .then(res => res.json())
                .then(resData => {
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
                    setData([]);
                    setLoading(false);
                });
        }
    }, [client, global, activeTab, token]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleCancel = async () => {
        if (!cancelReason.trim()) return alert('Debe ingresar un motivo');
        if (!window.confirm('¿Está seguro de cancelar esta factura? Esta acción descontará el dinero de su caja actual.')) return;

        setProcessing(true);
        try {
            const res = await fetch(`/api/billing/transaction/${cancelTxId}/cancel`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    reason: cancelReason,
                    current_user_id: user?.id
                })
            });
            const json = await res.json();

            if (res.ok) {
                alert('Factura Cancelada Correctamente');
                setCancelTxId(null);
                setCancelReason('');
                fetchData(); // Refresh
            } else {
                alert('Error: ' + json.msg);
            }
        } catch (e) {
            console.error(e);
            alert('Error de conexión');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
            <div className="glass-card animate-entry" style={{ width: '900px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', background: '#0f172a', position: 'relative' }}>

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
                                    borderLeft: log.action === 'CREATE' ? '4px solid #4ade80' : (log.action === 'PAYMENT' ? '4px solid #f59e0b' : (log.action === 'CANCELLATION' ? '4px solid #ef4444' : '4px solid #3b82f6'))
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
                                    <th style={{ padding: '0.75rem' }}>Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.length === 0 && <tr><td colSpan="7" style={{ padding: '2rem', textAlign: 'center' }}>No hay facturas registradas.</td></tr>}
                                {data.map((tx, idx) => {
                                    let months = '1';
                                    if (tx.details_json) {
                                        try { const sc = typeof tx.details_json === 'string' ? JSON.parse(tx.details_json) : tx.details_json; months = sc.months_paid || '1'; } catch (e) { }
                                    }
                                    const isCancelled = tx.status === 'CANCELLED';
                                    return (
                                        <tr key={tx.id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', opacity: isCancelled ? 0.6 : 1, textDecoration: isCancelled ? 'none' : 'none' }}>
                                            <td style={{ padding: '0.75rem' }}>
                                                {new Date(tx.created_at).toLocaleDateString()} {new Date(tx.created_at).toLocaleTimeString()}
                                                {isCancelled && <div style={{ color: '#ef4444', fontSize: '0.7rem', fontWeight: 'bold' }}>CANCELADA</div>}
                                            </td>
                                            <td style={{ padding: '0.75rem', color: isCancelled ? '#ef4444' : '#f59e0b', fontWeight: 'bold', textDecoration: isCancelled ? 'line-through' : 'none' }}>{tx.reference_id || 'S/N'}</td>
                                            <td style={{ padding: '0.75rem' }}>{tx.type === 'monthly_fee' ? 'Mensualidad' : tx.type}</td>
                                            <td style={{ padding: '0.75rem' }}>
                                                <div style={{ textDecoration: isCancelled ? 'line-through' : 'none' }}>{tx.description}</div>
                                                <div style={{ fontSize: '0.8em', color: '#64748b' }}>({months} Meses)</div>
                                                {isCancelled && <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.2rem' }}>Motivo: {tx.cancellation_reason}</div>}
                                            </td>
                                            <td style={{ padding: '0.75rem', textAlign: 'right', color: isCancelled ? '#ef4444' : '#4ade80', fontWeight: 'bold', textDecoration: isCancelled ? 'line-through' : 'none' }}>C$ {parseFloat(tx.amount).toFixed(2)}</td>
                                            <td style={{ padding: '0.75rem', fontSize: '0.9rem', color: '#94a3b8' }}>{tx.collector_username || 'Sistema'}</td>
                                            <td style={{ padding: '0.75rem' }}>
                                                {!isCancelled && tx.type !== 'RECONNECTION' && ( // Allow cancelling anything except simpler automated ones? No, allow all.
                                                    <button
                                                        onClick={() => setCancelTxId(tx.id)}
                                                        style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', border: 'none', padding: '0.3rem 0.6rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                                                    >
                                                        Cancelar
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}

                </div>

                {/* Cancel Modal Overlay */}
                {cancelTxId && (
                    <div style={{
                        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)',
                        display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1200
                    }}>
                        <div style={{ background: '#1e293b', padding: '2rem', borderRadius: '12px', width: '400px', border: '1px solid #ef4444', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
                            <h3 style={{ marginTop: 0, color: '#ef4444' }}>Cancelar Factura</h3>
                            <p style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>Ingrese el motivo de la cancelación. Esta acción es irreversible.</p>
                            <textarea
                                autoFocus
                                value={cancelReason}
                                onChange={e => setCancelReason(e.target.value)}
                                placeholder="Ej: Error de digitación, Cliente solicitó cambio..."
                                style={{ width: '100%', padding: '0.8rem', background: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '6px', minHeight: '80px', marginBottom: '1rem' }}
                            />
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                <button onClick={() => { setCancelTxId(null); setCancelReason(''); }} disabled={processing} style={{ padding: '0.6rem 1rem', background: 'transparent', border: '1px solid #475569', color: '#cbd5e1', borderRadius: '6px', cursor: 'pointer' }}>
                                    Volver
                                </button>
                                <button onClick={handleCancel} disabled={processing} style={{ padding: '0.6rem 1rem', background: '#ef4444', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', opacity: processing ? 0.7 : 1 }}>
                                    {processing ? 'Procesando...' : 'Confirmar Cancelación'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

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

