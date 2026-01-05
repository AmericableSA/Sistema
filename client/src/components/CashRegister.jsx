import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import CustomAlert from './CustomAlert';
import ConfirmModal from './ConfirmModal';
import ReceiptSettingsModal from './ReceiptSettingsModal';
import ReceiptModal from './ReceiptModal';

const CashRegister = (props) => {
    const { hasRole, user } = useAuth();
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(false);

    // Open State
    const [amount, setAmount] = useState('');
    const [rate, setRate] = useState('');
    // UI & Logic State
    const [showClosePrompt, setShowClosePrompt] = useState(false);
    const [showJustifyPrompt, setShowJustifyPrompt] = useState(false);
    const [showMovementModal, setShowMovementModal] = useState(false);

    const [movementType, setMovementType] = useState('IN');
    const [moveAmount, setMoveAmount] = useState('');
    const [moveDesc, setMoveDesc] = useState('');

    const [closingData, setClosingData] = useState({ physical: '', diff: 0, system: 0 });
    const [closingNote, setClosingNote] = useState('');

    const [alertInfo, setAlertInfo] = useState({ show: false, title: '', message: '', type: 'info' });

    // History & Filters
    const [history, setHistory] = useState([]);
    const [showHistory, setShowHistory] = useState(false);
    const [filterStart, setFilterStart] = useState('');
    const [filterEnd, setFilterEnd] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // New Modals
    const [showSettings, setShowSettings] = useState(false);
    const [receiptTransaction, setReceiptTransaction] = useState(null);
    const [cancelTxId, setCancelTxId] = useState(null);

    useEffect(() => { fetchStatus(); fetchHistory(); }, []);

    const handleSearchHistory = () => {
        fetchHistory(true);
    };

    const fetchHistory = async (useFilters = false) => {
        try {
            setLoading(true);
            let url = `/api/history?limit=7&page=${page}`; // Reduced limit for better card fit
            if (useFilters || filterStart || filterEnd || searchTerm) {
                if (filterStart) url += `&startDate=${filterStart}`;
                if (filterEnd) url += `&endDate=${filterEnd}`;
                if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
            }

            const res = await fetch(url);
            const jsonData = await res.json();

            if (jsonData.data && Array.isArray(jsonData.data)) {
                setHistory(jsonData.data);
                if (jsonData.pagination) {
                    setTotalPages(jsonData.pagination.totalPages);
                    // Ensure page isn't out of bounds if filters reduce count
                    if (page > jsonData.pagination.totalPages && jsonData.pagination.totalPages > 0) {
                        setPage(1);
                    }
                }
            } else {
                setHistory([]);
            }
            setLoading(false);
        } catch (e) {
            console.error(e);
            setLoading(false);
            setAlertInfo({ show: true, type: 'error', title: 'Error', message: 'No se pudo cargar el historial' });
        }
    };

    useEffect(() => {
        if (session) fetchHistory();
    }, [page, session]);

    const fetchStatus = async () => {
        try {
            const res = await fetch('/api/billing/status');
            const data = await res.json();
            setSession(data || null);
            setLoading(false);
            if (props.onSessionChange) props.onSessionChange(!!data);
        } catch (e) { console.error(e); setLoading(false); }
    };

    const handleOpen = async () => {
        if (!amount) return setAlertInfo({ show: true, type: 'error', title: 'Error', message: 'Ingrese monto inicial' });
        await fetch('/api/billing/open', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ start_amount: amount, exchange_rate: rate, current_user_id: user?.id })
        });
        fetchStatus();
        fetchHistory();
    };

    const attemptClose = async (physicalAmount, note = null) => {
        const res = await fetch('/api/billing/close', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: session.id,
                end_amount_physical: physicalAmount,
                closing_note: note,
                current_user_id: user?.id
            })
        });
        const data = await res.json();

        if (res.status === 400 && data.error === 'JUSTIFICATION_REQUIRED') {
            setClosingData({ physical: physicalAmount, diff: data.difference, system: data.systemTotal });
            setShowClosePrompt(false);
            setShowJustifyPrompt(true);
        } else if (res.ok) {
            setShowClosePrompt(false);
            setShowJustifyPrompt(false);
            setAlertInfo({ show: true, type: 'success', title: 'Caja Cerrada', message: 'Turno finalizado.' });
            fetchStatus();
        } else {
            setAlertInfo({ show: true, type: 'error', title: 'Error', message: data.msg });
        }
    };

    const handleMovement = async () => {
        if (!moveAmount || !moveDesc) return alert('Datos incompletos');
        await fetch('/api/billing/movement', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: movementType,
                amount: moveAmount,
                description: moveDesc,
                current_user_id: user?.id
            })
        });
        setShowMovementModal(false);
        setMoveAmount(''); setMoveDesc('');
        setAlertInfo({ show: true, type: 'success', title: 'Registrado', message: 'Movimiento guardado.' });
        fetchHistory();
    };

    const handleCancel = async (reason) => {
        if (!reason) return alert('Debe indicar un motivo');
        try {
            const res = await fetch(`/api/billing/transaction/${cancelTxId}/cancel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: reason, current_user_id: user?.id })
            });
            const data = await res.json();
            if (res.ok) {
                setAlertInfo({ show: true, type: 'success', title: 'Cancelado', message: 'Transacción cancelada correctamente' });
                setCancelTxId(null);
                fetchHistory(); // Refresh list to show CANCELLED status
            } else {
                setAlertInfo({ show: true, type: 'error', title: 'Error', message: data.msg });
            }
        } catch (e) {
            console.error(e);
            setAlertInfo({ show: true, type: 'error', title: 'Error', message: 'Fallo de conexión' });
        }
    };

    const handleReprint = async (txId) => {
        try {
            const res = await fetch(`/api/billing/transaction/${txId}`);
            if (!res.ok) throw new Error('Error recuperando transacción');
            const data = await res.json();
            setReceiptTransaction({ ...data, transactionId: data.id });
        } catch (e) {
            console.error(e);
            setAlertInfo({ show: true, type: 'error', title: 'Error', message: 'No se pudo cargar el recibo.' });
        }
    };

    // If session exists, show Dashboard
    if (session) {
        return (
            <div className="animate-slide-up" style={{ marginBottom: '2rem' }}>
                <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                    {/* Header */}
                    <div className="flex-between" style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <div className="flex-center" style={{ gap: '10px' }}>
                            <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Panel de Caja</h2>
                            <button onClick={() => setShowSettings(true)} className="btn-icon" title="Configurar Recibos">⚙️</button>
                        </div>
                        <div className="text-right">
                            <small className="text-muted" style={{ display: 'block' }}>Fondo Inicial</small>
                            <span style={{ color: '#34d399', fontSize: '1.5rem', fontWeight: 'bold' }}>C$ {parseFloat(session.start_amount).toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Actions Grid */}
                    <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem' }}>
                        <button onClick={() => { setMovementType('IN'); props.setViewMode('MOVEMENT_IN'); }} className="btn-action" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#6ee7b7', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                            <span style={{ fontSize: '1.5rem', display: 'block' }}>📥</span> Entrada
                        </button>
                        <button onClick={() => { setMovementType('OUT'); props.setViewMode('MOVEMENT_OUT'); }} className="btn-action" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                            <span style={{ fontSize: '1.5rem', display: 'block' }}>📤</span> Salida
                        </button>
                        <button onClick={() => props.setViewMode('HISTORY')} className="btn-action" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                            <span style={{ fontSize: '1.5rem', display: 'block' }}>📜</span> Historial
                        </button>
                        {hasRole(['admin', 'cajero']) && (
                            <button onClick={() => setShowClosePrompt(true)} className="btn-action" style={{ background: 'rgba(234, 179, 8, 0.1)', color: '#fcd34d', border: '1px solid rgba(234, 179, 8, 0.3)' }}>
                                <span style={{ fontSize: '1.5rem', display: 'block' }}>🛑</span> Cerrar
                            </button>
                        )}
                    </div>
                </div>

                {/* MODALS */}
                <ConfirmModal isOpen={showClosePrompt} title="Cierre de Turno" message="Cuente todo el dinero y digite el total:" type="prompt" inputPlaceholder="Total Efectivo (C$)" onConfirm={(val) => attemptClose(val)} onCancel={() => setShowClosePrompt(false)} />
                <ConfirmModal
                    isOpen={!!cancelTxId}
                    title="Cancelar Transacción"
                    message="IMPORTANTE: Esta acción descontará el dinero de la caja actual y revertirá el pago del cliente. Ingrese el motivo:"
                    type="prompt"
                    inputType="text"
                    inputPlaceholder="Motivo de cancelación..."
                    onConfirm={handleCancel}
                    onCancel={() => setCancelTxId(null)}
                />

                {/* Style for hover effects */}
                <style>{`
                    .btn-action { padding: 1.5rem; border-radius: 16px; font-weight: bold; cursor: pointer; transition: all 0.2s; text-align: center; } 
                    .btn-action:hover { transform: translateY(-3px); filter: brightness(1.2); }
                `}</style>

                {/* INLINE MOVEMENT FORM */}
                {(props.viewMode === 'MOVEMENT_IN' || props.viewMode === 'MOVEMENT_OUT') && (
                    <div className="animate-entry" style={{ marginTop: '1.5rem' }}>
                        <div className="glass-card" style={{ maxWidth: '600px', margin: '0 auto', background: 'rgba(30, 41, 59, 0.4)' }}>
                            <div className="flex-between" style={{ marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem' }}>
                                <h3 className="text-white" style={{ margin: 0 }}>
                                    {props.viewMode === 'MOVEMENT_IN' ? '📥 Registrar Entrada' : '📤 Registrar Salida'}
                                </h3>
                                <button onClick={() => props.setViewMode('SEARCH')} className="btn-icon-close">×</button>
                            </div>

                            <div className="flex-col" style={{ gap: '1rem' }}>
                                <div>
                                    <label className="text-muted" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Monto (C$)</label>
                                    <input type="number" className="input-dark" autoFocus value={moveAmount} onChange={e => setMoveAmount(e.target.value)} style={{ fontSize: '1.5rem', fontWeight: 'bold' }} placeholder="0.00" />
                                </div>
                                <div>
                                    <label className="text-muted" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Descripción</label>
                                    <input type="text" className="input-dark" value={moveDesc} onChange={e => setMoveDesc(e.target.value)} placeholder="Razón del movimiento..." />
                                </div>
                                <div className="flex-between" style={{ marginTop: '1.5rem' }}>
                                    <button onClick={() => props.setViewMode('SEARCH')} className="btn-secondary">Cancelar</button>
                                    <button onClick={handleMovement} className="btn-dark-glow" style={{ background: props.viewMode === 'MOVEMENT_IN' ? '#10b981' : '#ef4444' }}>
                                        GUARDAR {props.viewMode === 'MOVEMENT_IN' ? 'ENTRADA' : 'SALIDA'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* INLINE HISTORY TABLE */}
                {props.viewMode === 'HISTORY' && (
                    <div className="animate-entry" style={{ marginTop: '1.5rem' }}>
                        <div className="glass-panel" style={{ width: '100%', padding: '0', overflow: 'hidden', borderRadius: '24px', display: 'flex', flexDirection: 'column' }}>
                            {/* Tuani Header */}
                            <div className="flex-between" style={{ padding: '1.5rem 2rem', background: '#0f172a', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <div className="flex-center" style={{ gap: '12px' }}>
                                    <span style={{ fontSize: '1.8rem' }}>📜</span>
                                    <div>
                                        <h3 className="text-white" style={{ margin: 0, fontSize: '1.25rem', letterSpacing: '0.5px' }}>Historial de Transacciones</h3>
                                        <small className="text-muted">Movimientos y Ventas Registradas</small>
                                    </div>
                                </div>
                                <button onClick={() => props.setViewMode('SEARCH')} className="btn-icon-close">×</button>
                            </div>

                            {/* Filters Bar */}
                            <div className="flex-between" style={{ padding: '1.25rem 2rem', background: '#1e293b', gap: '1rem', flexWrap: 'wrap', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <div className="flex-center filters-container" style={{ gap: '0.8rem', background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <input type="date" className="input-dark" value={filterStart} onChange={e => setFilterStart(e.target.value)} style={{ padding: '0.4rem', fontSize: '0.9rem' }} />
                                    <span className="text-muted">→</span>
                                    <input type="date" className="input-dark" value={filterEnd} onChange={e => setFilterEnd(e.target.value)} style={{ padding: '0.4rem', fontSize: '0.9rem' }} />
                                </div>

                                <div style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: '250px' }}>
                                    <div style={{ position: 'relative', width: '100%' }}>
                                        <input
                                            type="text"
                                            placeholder="Buscar por cliente, descripción..."
                                            className="input-dark"
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleSearchHistory()}
                                            style={{ paddingRight: '2.5rem' }}
                                        />
                                        <button onClick={handleSearchHistory} className="search-icon-btn">🔍</button>
                                    </div>
                                </div>
                            </div>

                            {/* Data Table Area - Responsive Flex */}
                            <div style={{ padding: '0', overflowX: 'auto', flex: 1, overflowY: 'auto', minHeight: '300px' }}>
                                <table className="table-tuani">
                                    <thead>
                                        <tr>
                                            <th>Hora</th>
                                            <th>No. Factura</th>
                                            <th>Tipo</th>
                                            <th>Descripción / Cliente</th>
                                            <th className="text-right">Monto</th>
                                            <th className="text-center">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr><td colSpan="6" className="text-center" style={{ padding: '4rem' }}><div className="spinner"></div></td></tr>
                                        ) : history.length === 0 ? (
                                            <tr>
                                                <td colSpan="6" className="text-center" style={{ padding: '4rem' }}>
                                                    <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}>📭</div>
                                                    <p className="text-muted">No se encontraron registros para esta búsqueda.</p>
                                                </td>
                                            </tr>
                                        ) : (
                                            history.map((tx, i) => {
                                                const isSale = tx.type === 'SALE' || tx.type === 'VENTA';
                                                const isIncome = isSale || tx.type === 'INGRESO' || tx.type === 'IN';
                                                const dateObj = new Date(tx.created_at);
                                                const isCancelled = tx.status === 'CANCELLED';

                                                return (
                                                    <tr key={tx.id || i} className="row-hover" style={{
                                                        opacity: isCancelled ? 0.6 : 1,
                                                        background: isCancelled ? 'rgba(15, 23, 42, 0.6)' : undefined
                                                    }}>
                                                        <td style={{ color: isCancelled ? '#94a3b8' : '#94a3b8', fontSize: '0.9rem' }}>
                                                            <div style={{ fontWeight: 'bold', color: isCancelled ? '#cbd5e1' : '#e2e8f0', textDecoration: isCancelled ? 'line-through' : 'none' }}>{dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                            <div style={{ fontSize: '0.75rem', textDecoration: isCancelled ? 'line-through' : 'none' }}>{dateObj.toLocaleDateString()}</div>
                                                        </td>
                                                        <td style={{ color: isCancelled ? '#ef4444' : '#f59e0b', fontWeight: 'bold', textDecoration: isCancelled ? 'line-through' : 'none' }}>
                                                            {tx.reference_id || 'S/N'}
                                                        </td>
                                                        <td>
                                                            {isCancelled ? (
                                                                <span className="badge" style={{ background: '#ef4444', color: 'white', textDecoration: 'none' }}>ANULADO</span>
                                                            ) : (
                                                                <span className={`badge ${isIncome ? 'badge-success' : 'badge-danger'}`}>
                                                                    {tx.type === 'SALE' ? 'VENTA' : tx.type}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td>
                                                            <div style={{ color: isCancelled ? '#ef4444' : '#f1f5f9', fontWeight: '500', textDecoration: isCancelled ? 'line-through' : 'none' }}>{tx.client_name || tx.description}</div>
                                                            {tx.client_name && tx.description && tx.description !== tx.client_name && (
                                                                <div style={{ fontSize: '0.8rem', color: isCancelled ? '#fca5a5' : '#64748b', textDecoration: isCancelled ? 'line-through' : 'none' }}>{tx.description}</div>
                                                            )}
                                                            {isCancelled && tx.cancellation_reason && (
                                                                <div style={{ fontSize: '0.75rem', color: '#ef4444', fontStyle: 'italic', marginTop: '2px' }}>
                                                                    Motivo: {tx.cancellation_reason}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="text-right">
                                                            <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: isCancelled ? '#ef4444' : (isIncome ? '#34d399' : '#f87171'), textDecoration: isCancelled ? 'line-through' : 'none' }}>
                                                                {isIncome ? '+' : '-'} C$ {Number(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                            </span>
                                                        </td>
                                                        <td className="text-center" style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                                            {isSale && !isCancelled && (
                                                                <button onClick={() => handleReprint(tx.id)} className="btn-icon-soft" title="Reimprimir Recibo">
                                                                    🖨️
                                                                </button>
                                                            )}
                                                            {!isCancelled && isSale && (
                                                                <button
                                                                    onClick={() => setCancelTxId(tx.id)}
                                                                    className="btn-icon-soft"
                                                                    title="Cancelar Factura"
                                                                    style={{ color: '#f87171', background: 'rgba(239, 68, 68, 0.1)' }}
                                                                >
                                                                    ❌
                                                                </button>
                                                            )}
                                                            {isCancelled && (
                                                                <span style={{ fontSize: '1.2rem', cursor: 'help' }} title="Factura Cancelada">🚫</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination Footer */}
                            <div className="flex-between" style={{ padding: '1rem 2rem', borderTop: '1px solid rgba(255,255,255,0.05)', background: '#0f172a' }}>
                                <div className="text-muted" style={{ fontSize: '0.9rem' }}>
                                    Página <span style={{ color: 'white', fontWeight: 'bold' }}>{page}</span> de {totalPages || 1}
                                </div>
                                <div style={{ display: 'flex', gap: '0.8rem' }}>
                                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-nav">
                                        ◀ Anterior
                                    </button>
                                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="btn-nav">
                                        Siguiente ▶
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {showJustifyPrompt && (
                    <div className="modal-overlay">
                        <div className="modal-content" style={{ border: '1px solid #eab308' }}>
                            <div className="text-center" style={{ marginBottom: '1.5rem' }}>
                                <div style={{ fontSize: '3rem' }}>⚠️</div>
                                <h3 style={{ color: '#fbbf24' }}>Diferencia Detectada</h3>
                                <p className="text-muted">
                                    Sistema: <strong>C$ {closingData.system?.toFixed(2)}</strong> <br />
                                    Físico: <strong>C$ {Number(closingData.physical).toFixed(2)}</strong> <br />
                                    Diferencia: <strong style={{ color: closingData.diff > 0 ? '#34d399' : '#ef4444' }}>{closingData.diff?.toFixed(2)}</strong>
                                </p>
                                <p style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Es obligatorio justificar este descuadre.</p>
                            </div>
                            <textarea className="input-dark" rows="3" placeholder="Explique la razón..." value={closingNote} onChange={e => setClosingNote(e.target.value)} autoFocus></textarea>
                            <div className="flex-between" style={{ marginTop: '1.5rem', justifyContent: 'flex-end', gap: '1rem' }}>
                                <button onClick={() => setShowJustifyPrompt(false)} className="btn-secondary">Cancelar</button>
                                <button onClick={() => attemptClose(closingData.physical, closingNote)} className="btn-dark-glow" style={{ background: '#eab308', color: 'black' }}>Confirmar</button>
                            </div>
                        </div>
                    </div>
                )}

                {receiptTransaction && <ReceiptModal transaction={receiptTransaction} onClose={() => setReceiptTransaction(null)} />}
            </div>
        );
    }

    // Closed Session State
    return (
        <div className="flex-center" style={{ minHeight: '80vh' }}>
            <div className="modal-content text-center" style={{ border: '1px solid rgba(239, 68, 68, 0.5)', maxWidth: '400px' }}>
                <div style={{ position: 'absolute', top: '15px', right: '15px' }}>
                    <button onClick={() => setShowSettings(true)} className="btn-icon" style={{ background: 'rgba(255,255,255,0.05)' }} title="Configuración">⚙️</button>
                </div>

                <div style={{ fontSize: '4rem', marginBottom: '1rem', filter: 'drop-shadow(0 0 15px rgba(239, 68, 68, 0.4))' }}>🔒</div>
                <h2 style={{ marginBottom: '0.5rem' }}>Caja Cerrada</h2>
                <p className="text-muted" style={{ marginBottom: '2rem' }}>Debe abrir un turno para comenzar a cobrar.</p>

                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem', textAlign: 'left' }}>
                    <div style={{ marginBottom: '1rem' }}>
                        <label className="text-muted" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Tasa de Cambio ($1 = C$)</label>
                        <input type="number" step="0.0001" placeholder="36.6243" className="input-dark text-center" style={{ fontSize: '1.2rem' }} value={rate} onChange={e => setRate(e.target.value)} />
                    </div>
                    <div>
                        <label className="text-muted" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Monto Inicial (C$)</label>
                        <input type="number" placeholder="0.00" className="input-dark text-center" style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#34d399' }} value={amount} autoFocus onChange={e => setAmount(e.target.value)} />
                    </div>
                </div>



                {hasRole(['admin', 'cajero']) && (
                    <button onClick={handleOpen} className="btn-dark-glow" style={{ width: '100%', justifyContent: 'center', background: 'linear-gradient(to right, #059669, #10b981)', color: 'white', border: 'none' }}>🔓 ABRIR TURNO</button>
                )}
            </div>

            <CustomAlert isOpen={alertInfo.show} title={alertInfo.title} message={alertInfo.message} type={alertInfo.type} onClose={() => setAlertInfo({ ...alertInfo, show: false })} />
            {showSettings && <ReceiptSettingsModal onClose={() => setShowSettings(false)} />}
        </div >
    );
};

export default CashRegister;

