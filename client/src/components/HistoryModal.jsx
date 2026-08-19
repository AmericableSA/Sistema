import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import ReceiptModal from './ReceiptModal';
import {
    FaFileInvoiceDollar, FaHistory, FaPrint, FaBan,
    FaCalendarDay, FaSearch, FaUser, FaCheckCircle,
    FaMoneyBillWave, FaClock, FaExchangeAlt, FaTimes
} from 'react-icons/fa';

const HistoryModal = ({ client, onClose, global = false, initialTab = 'logs' }) => {
    const { token, user } = useAuth();
    const [activeTab, setActiveTab] = useState(initialTab); // 'logs' | 'invoices'
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    // Cancel State
    const [cancelTxId, setCancelTxId] = useState(null);
    const [cancelReason, setCancelReason] = useState('');
    const [processing, setProcessing] = useState(false);

    // Reprint State
    const [receiptTransaction, setReceiptTransaction] = useState(null);

    // Filter State
    const [search, setSearch] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

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
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            if (activeTab === 'invoices') {
                if (startDate) params.append('startDate', startDate);
                if (endDate) params.append('endDate', endDate);
            }

            const fullUrl = `${url}?${params.toString()}`;

            fetch(fullUrl, {
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
    }, [client, global, activeTab, token, search, startDate, endDate]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const setQuickDate = (preset) => {
        const now = new Date();
        const getISO = (d) => d.toLocaleDateString('sv-SE', { timeZone: 'America/Managua' });

        if (preset === 'today') {
            const t = getISO(now);
            setStartDate(t);
            setEndDate(t);
        } else if (preset === 'month') {
            const first = new Date(now.getFullYear(), now.getMonth(), 1);
            setStartDate(getISO(first));
            setEndDate(getISO(now));
        } else if (preset === 'year') {
            const firstOfYear = new Date(now.getFullYear(), 0, 1);
            setStartDate(getISO(firstOfYear));
            setEndDate(getISO(now));
        } else if (preset === 'all') {
            setStartDate('');
            setEndDate('');
        }
    };

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

    const handleReprintReceipt = async (txId) => {
        try {
            const res = await fetch(`/api/billing/transaction/${txId}`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            if (!res.ok) throw new Error('Error al obtener factura');
            const txData = await res.json();
            setReceiptTransaction({ ...txData, transactionId: txData.id });
        } catch (e) {
            console.error(e);
            alert('No se pudo cargar el recibo para impresión.');
        }
    };

    // Summary calculations
    const invoiceStats = useMemo(() => {
        if (activeTab !== 'invoices') return null;
        let total = 0;
        let validCount = 0;
        let cancelledCount = 0;
        data.forEach(item => {
            if (item.status === 'CANCELLED') {
                cancelledCount++;
            } else {
                validCount++;
                total += parseFloat(item.amount || 0);
            }
        });
        return { total, validCount, cancelledCount };
    }, [data, activeTab]);

    return (
        <div className="modal-overlay" style={{ zIndex: 1100, padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="glass-card animate-entry" style={{ width: '95%', maxWidth: '1050px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', position: 'relative', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7)' }}>

                {/* Header */}
                <div style={{ padding: '1.5rem 2rem', background: '#0f172a', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ background: 'rgba(59, 130, 246, 0.15)', padding: '0.75rem', borderRadius: '14px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                            {activeTab === 'invoices' ? <FaFileInvoiceDollar size={22} color="#60a5fa" /> : <FaHistory size={22} color="#60a5fa" />}
                        </div>
                        <div>
                            <h3 style={{ margin: 0, color: 'white', fontSize: '1.25rem', fontWeight: '800' }}>
                                {global ? 'HISTORIAL GLOBAL DE CLIENTES' : `HISTORIAL: ${client?.full_name?.toUpperCase()}`}
                            </h3>
                            {client?.contract_number && (
                                <span style={{ color: '#60a5fa', fontSize: '0.85rem', fontWeight: '600' }}>
                                    Contrato No. {client.contract_number}
                                </span>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} className="btn-icon-close" title="Cerrar">×</button>
                </div>

                {/* Tabs */}
                {!global && (
                    <div style={{ display: 'flex', background: '#1e293b', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 2rem' }}>
                        <button
                            onClick={() => setActiveTab('logs')}
                            style={{
                                padding: '0.9rem 1.5rem', background: 'none', border: 'none',
                                color: activeTab === 'logs' ? '#60a5fa' : '#94a3b8',
                                borderBottom: activeTab === 'logs' ? '3px solid #60a5fa' : '3px solid transparent',
                                cursor: 'pointer', fontWeight: '700', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px'
                            }}
                        >
                            <FaClock /> Bitácora de Cambios
                        </button>
                        <button
                            onClick={() => setActiveTab('invoices')}
                            style={{
                                padding: '0.9rem 1.5rem', background: 'none', border: 'none',
                                color: activeTab === 'invoices' ? '#fbbf24' : '#94a3b8',
                                borderBottom: activeTab === 'invoices' ? '3px solid #fbbf24' : '3px solid transparent',
                                cursor: 'pointer', fontWeight: '700', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px'
                            }}
                        >
                            <FaFileInvoiceDollar /> Historial de Facturas & Pagos
                        </button>
                    </div>
                )}

                {/* Summary Badges for Invoices */}
                {activeTab === 'invoices' && invoiceStats && (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                        gap: '1rem',
                        padding: '1rem 2rem',
                        background: 'rgba(30, 41, 59, 0.4)',
                        borderBottom: '1px solid rgba(255,255,255,0.05)'
                    }}>
                        <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '12px', padding: '0.6rem 1rem' }}>
                            <div style={{ color: '#6ee7b7', fontSize: '0.75rem', fontWeight: '700' }}>💵 Total Pagado</div>
                            <div style={{ color: '#34d399', fontSize: '1.2rem', fontWeight: '800', marginTop: '2px' }}>
                                C$ {invoiceStats.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </div>
                        </div>
                        <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '12px', padding: '0.6rem 1rem' }}>
                            <div style={{ color: '#93c5fd', fontSize: '0.75rem', fontWeight: '700' }}>🧾 Facturas Pagadas</div>
                            <div style={{ color: '#60a5fa', fontSize: '1.2rem', fontWeight: '800', marginTop: '2px' }}>
                                {invoiceStats.validCount}
                            </div>
                        </div>
                        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '12px', padding: '0.6rem 1rem' }}>
                            <div style={{ color: '#fca5a5', fontSize: '0.75rem', fontWeight: '700' }}>🚫 Facturas Anuladas</div>
                            <div style={{ color: '#f87171', fontSize: '1.2rem', fontWeight: '800', marginTop: '2px' }}>
                                {invoiceStats.cancelledCount}
                            </div>
                        </div>
                    </div>
                )}

                {/* Filters Bar */}
                <div style={{ padding: '0.85rem 2rem', background: '#0f172a', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                        <input
                            type="text"
                            placeholder="🔍 Buscar por número de factura, concepto..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="input-dark"
                            style={{ width: '100%', padding: '0.5rem 0.75rem 0.5rem 2.2rem', fontSize: '0.85rem' }}
                        />
                        <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
                    </div>

                    {activeTab === 'invoices' && (
                        <>
                            <div className="flex-center" style={{ gap: '0.4rem', background: 'rgba(255,255,255,0.03)', padding: '0.35rem 0.6rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="input-dark"
                                    style={{ padding: '0.3rem', fontSize: '0.85rem' }}
                                />
                                <span style={{ color: '#64748b' }}>→</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="input-dark"
                                    style={{ padding: '0.3rem', fontSize: '0.85rem' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '0.35rem' }}>
                                <button onClick={() => setQuickDate('today')} className="btn-letter" style={{ padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.25)' }}>
                                    Hoy
                                </button>
                                <button onClick={() => setQuickDate('month')} className="btn-letter" style={{ padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)', color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    Mes
                                </button>
                                <button onClick={() => setQuickDate('year')} className="btn-letter" style={{ padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)', color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    Año
                                </button>
                                <button onClick={() => setQuickDate('all')} className="btn-letter" style={{ padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    Todo
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem', minHeight: '300px', WebkitOverflowScrolling: 'touch' }}>
                    {loading && (
                        <div style={{ color: 'white', textAlign: 'center', padding: '3rem' }}>
                            <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
                            <span style={{ color: '#94a3b8' }}>Cargando registros...</span>
                        </div>
                    )}

                    {!loading && activeTab === 'logs' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                            {data.length === 0 && (
                                <div style={{ color: '#64748b', textAlign: 'center', padding: '3rem' }}>
                                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📭</div>
                                    No hay registros de cambios para este cliente.
                                </div>
                            )}
                            {data.map((log, idx) => (
                                <div key={log.id || idx} style={{
                                    padding: '1rem 1.25rem', background: '#1e293b', borderRadius: '12px',
                                    borderLeft: log.action === 'CREATE' ? '4px solid #4ade80' : (log.action === 'PAYMENT' ? '4px solid #f59e0b' : (log.action === 'CANCELLATION' ? '4px solid #ef4444' : '4px solid #3b82f6')),
                                    border: '1px solid rgba(255,255,255,0.04)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                            <span style={{ color: 'white', fontWeight: '800', fontSize: '0.9rem' }}>{log.action}</span>
                                            {global && <span style={{ color: '#60a5fa', fontSize: '0.85rem', background: 'rgba(96, 165, 250, 0.1)', padding: '0.15rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(96, 165, 250, 0.2)' }}>{log.client_name}</span>}
                                        </div>
                                        <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{new Date(log.timestamp).toLocaleString('es-NI', { timeZone: 'America/Managua', hour12: true })}</span>
                                    </div>
                                    <div style={{ color: '#cbd5e1', fontSize: '0.9rem', background: '#0f172a', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                                        <LogContent content={log.details} />
                                    </div>
                                    <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <FaUser size={10} /> Por: <strong style={{ color: '#94a3b8' }}>{log.username || 'Sistema'}</strong>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {!loading && activeTab === 'invoices' && (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, color: '#cbd5e1', minWidth: '750px' }}>
                                <thead>
                                    <tr style={{ background: '#0f172a', textAlign: 'left', color: '#94a3b8', fontSize: '0.85rem' }}>
                                        <th style={{ padding: '0.85rem 1rem' }}>Fecha</th>
                                        <th style={{ padding: '0.85rem 1rem' }}>Factura #</th>
                                        <th style={{ padding: '0.85rem 1rem' }}>Tipo</th>
                                        <th style={{ padding: '0.85rem 1rem' }}>Detalle / Meses</th>
                                        <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Monto</th>
                                        <th style={{ padding: '0.85rem 1rem' }}>Cobrador</th>
                                        <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.length === 0 && (
                                        <tr>
                                            <td colSpan="7" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                                                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📭</div>
                                                No hay facturas registradas en este periodo.
                                            </td>
                                        </tr>
                                    )}
                                    {data.map((tx, idx) => {
                                        let months = '1';
                                        if (tx.details_json) {
                                            try {
                                                const sc = typeof tx.details_json === 'string' ? JSON.parse(tx.details_json) : tx.details_json;
                                                months = sc.months_paid || '1';
                                            } catch (e) { }
                                        }
                                        const isCancelled = tx.status === 'CANCELLED';
                                        const dateObj = new Date(tx.created_at);

                                        return (
                                            <tr key={tx.id || idx} style={{
                                                borderBottom: '1px solid rgba(255,255,255,0.04)',
                                                opacity: isCancelled ? 0.6 : 1,
                                                background: isCancelled ? 'rgba(239, 68, 68, 0.03)' : undefined
                                            }}>
                                                <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem' }}>
                                                    <div style={{ fontWeight: '700', color: isCancelled ? '#cbd5e1' : '#f8fafc', textDecoration: isCancelled ? 'line-through' : 'none' }}>
                                                        {dateObj.toLocaleDateString('es-NI', { timeZone: 'America/Managua', day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                                        {dateObj.toLocaleTimeString('es-NI', { timeZone: 'America/Managua', hour12: true, hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                    {isCancelled && <div style={{ color: '#ef4444', fontSize: '0.7rem', fontWeight: 'bold', marginTop: '2px' }}>CANCELADA</div>}
                                                </td>

                                                <td style={{ padding: '0.85rem 1rem' }}>
                                                    <span style={{
                                                        background: isCancelled ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                                        color: isCancelled ? '#f87171' : '#fbbf24',
                                                        border: isCancelled ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
                                                        padding: '0.2rem 0.5rem',
                                                        borderRadius: '6px',
                                                        fontWeight: '800',
                                                        fontSize: '0.85rem',
                                                        textDecoration: isCancelled ? 'line-through' : 'none'
                                                    }}>
                                                        #{tx.reference_id || 'S/N'}
                                                    </span>
                                                </td>

                                                <td style={{ padding: '0.85rem 1rem' }}>
                                                    <span className={`badge ${isCancelled ? 'badge-danger' : 'badge-success'}`} style={{ fontSize: '0.75rem' }}>
                                                        {tx.type === 'monthly_fee' ? 'Mensualidad' : (tx.type === 'material_sale' ? 'Materiales' : tx.type)}
                                                    </span>
                                                </td>

                                                <td style={{ padding: '0.85rem 1rem' }}>
                                                    <div style={{ textDecoration: isCancelled ? 'line-through' : 'none', color: isCancelled ? '#94a3b8' : '#f1f5f9', fontWeight: '600' }}>
                                                        {tx.description}
                                                    </div>
                                                    {months && months !== '1' && (
                                                        <div style={{ fontSize: '0.75rem', color: '#60a5fa' }}>({months} Meses pagados)</div>
                                                    )}
                                                    {isCancelled && tx.cancellation_reason && (
                                                        <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.2rem', fontStyle: 'italic' }}>
                                                            Motivo: {tx.cancellation_reason}
                                                        </div>
                                                    )}
                                                </td>

                                                <td style={{ padding: '0.85rem 1rem', textAlign: 'right', color: isCancelled ? '#ef4444' : '#34d399', fontWeight: '800', fontSize: '1rem', textDecoration: isCancelled ? 'line-through' : 'none' }}>
                                                    C$ {parseFloat(tx.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                </td>

                                                <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', color: '#94a3b8' }}>
                                                    {tx.collector_username || 'Sistema'}
                                                </td>

                                                <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                                                        {!isCancelled && (
                                                            <button
                                                                onClick={() => handleReprintReceipt(tx.id)}
                                                                className="btn-icon-soft"
                                                                title="Reimprimir Recibo"
                                                                style={{ padding: '0.35rem 0.55rem', background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#60a5fa' }}
                                                            >
                                                                <FaPrint size={12} />
                                                            </button>
                                                        )}
                                                        {!isCancelled && (
                                                            <button
                                                                onClick={() => setCancelTxId(tx.id)}
                                                                className="btn-icon-soft"
                                                                title="Anular Factura"
                                                                style={{ color: '#f87171', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '0.35rem 0.55rem' }}
                                                            >
                                                                <FaBan size={12} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                </div>

                {/* Cancel Modal Overlay */}
                {cancelTxId && (
                    <div style={{
                        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
                        display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1200, padding: '1rem'
                    }}>
                        <div style={{ background: '#1e293b', padding: '2rem', borderRadius: '16px', width: '100%', maxWidth: '420px', border: '1px solid rgba(239, 68, 68, 0.5)', boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
                                <FaBan color="#ef4444" size={20} />
                                <h3 style={{ margin: 0, color: '#ef4444', fontSize: '1.2rem' }}>Cancelar Factura</h3>
                            </div>
                            <p style={{ color: '#cbd5e1', fontSize: '0.85rem', marginBottom: '1rem' }}>
                                Ingrese el motivo de la cancelación. Esta acción descontará el saldo de su turno actual y quedará auditada.
                            </p>
                            <textarea
                                autoFocus
                                value={cancelReason}
                                onChange={e => setCancelReason(e.target.value)}
                                placeholder="Ej: Error de digitación, Cliente solicitó cambio..."
                                className="input-dark"
                                style={{ width: '100%', padding: '0.75rem', minHeight: '80px', marginBottom: '1.25rem', fontSize: '0.9rem' }}
                            />
                            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                                <button
                                    onClick={() => { setCancelTxId(null); setCancelReason(''); }}
                                    disabled={processing}
                                    className="btn-secondary"
                                    style={{ padding: '0.6rem 1.25rem', fontSize: '0.85rem' }}
                                >
                                    Volver
                                </button>
                                <button
                                    onClick={handleCancel}
                                    disabled={processing || !cancelReason.trim()}
                                    className="btn-dark-glow"
                                    style={{ background: '#ef4444', color: 'white', padding: '0.6rem 1.25rem', fontSize: '0.85rem', fontWeight: '800', opacity: (processing || !cancelReason.trim()) ? 0.6 : 1 }}
                                >
                                    {processing ? 'Cancelando...' : 'Confirmar Cancelación'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Receipt Reprint Modal */}
                {receiptTransaction && (
                    <ReceiptModal
                        transaction={receiptTransaction}
                        onClose={() => setReceiptTransaction(null)}
                        autoPrint={true}
                    />
                )}

            </div>
        </div>
    );
};

// Helper to render log content (JSON or Text)
const LogContent = ({ content }) => {
    try {
        const changes = JSON.parse(content);
        if (Array.isArray(changes)) {
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {changes.map((change, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                            <span style={{ color: '#94a3b8', fontWeight: '600', minWidth: '85px' }}>{change.field}:</span>
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
        return <span>{content}</span>;
    }
};

export default HistoryModal;


