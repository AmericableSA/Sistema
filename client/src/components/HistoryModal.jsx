import React, { useState, useEffect } from 'react';

const HistoryModal = ({ client, onClose, global = false }) => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const url = global
            ? '/api/clients/history/global'
            : `/api/clients/${client?.id}/history`;

        if (global || client) {
            fetch(url)
                .then(res => res.json())
                .then(data => { setLogs(data); setLoading(false); })
                .catch(err => { console.error(err); setLoading(false); });
        }
    }, [client, global]);

    return (
        <div className="modal-overlay">
            <div className="glass-card" style={{ width: '800px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', background: '#0f172a' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3 style={{ margin: 0, color: 'white' }}>{global ? 'HISTORIAL GLOBAL DE CAMBIOS' : 'HISTORIAL DE CAMBIOS'}</h3>
                        {!global && <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Cliente: {client?.full_name}</div>}
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
                    {loading ? <div style={{ color: 'white' }}>Cargando...</div> : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {logs.length === 0 && <div style={{ color: '#64748b', textAlign: 'center' }}>No hay registros de cambios.</div>}
                            {logs.map(log => (
                                <div key={log.id} style={{
                                    padding: '1rem', background: '#1e293b', borderRadius: '8px', borderLeft: log.action === 'CREATE' ? '4px solid #4ade80' : '4px solid #3b82f6'
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

