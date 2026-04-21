import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import CustomAlert from './CustomAlert';
import ConfirmModal from './ConfirmModal';
import ReceiptSettingsModal from './ReceiptSettingsModal';
import ReceiptModal from './ReceiptModal';
import { 
    FaCashRegister, FaHandHoldingUsd, FaHistory, FaLock, 
    FaArrowUp, FaArrowDown, FaBuilding, FaMotorcycle, FaSyncAlt 
} from 'react-icons/fa';
import styled, { keyframes } from 'styled-components';

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
    const [filterCollector, setFilterCollector] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // New Modals
    const [showSettings, setShowSettings] = useState(false);
    const [receiptTransaction, setReceiptTransaction] = useState(null);
    const [cancelTxId, setCancelTxId] = useState(null);

    // Users for Filter
    const [users, setUsers] = useState([]);
    const [sessionType, setSessionType] = useState('OFICINA'); // 'OFICINA' or 'COBRADOR'

    useEffect(() => {
        fetchStatus();
        fetchHistory();
        fetchUsers();
        if (props.onTypeChange) props.onTypeChange(sessionType);
    }, [sessionType]);

    const handleSearchHistory = () => {
        fetchHistory(true);
    };

    const fetchHistory = async (useFilters = false) => {
        try {
            setLoading(true);
            let url = `/api/billing/history?limit=7&page=${page}&session_type=${sessionType}`; // Added session_type
            if (useFilters || filterStart || filterEnd || searchTerm || filterCollector) {
                if (filterStart) url += `&startDate=${filterStart}`;
                if (filterEnd) url += `&endDate=${filterEnd}`;
                if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
                if (filterCollector) url += `&collector=${filterCollector}`;
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

    useEffect(() => {
        if (props.viewMode === 'HISTORY') {
            fetchHistory(true); // Refrescar historial automáticamente al abrir la pestaña
        }
    }, [props.viewMode]);

    const fetchStatus = async () => {
        try {
            const res = await fetch(`/api/billing/status?type=${sessionType}`);
            const data = await res.json();
            setSession(data || null);
            setLoading(false);
            if (props.onSessionChange) props.onSessionChange(!!data);
        } catch (e) { console.error(e); setLoading(false); }
    };

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/users');
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            }
        } catch (e) { console.error("Error loading users", e); }
    };

    const handleOpen = async () => {
        if (!amount) return setAlertInfo({ show: true, type: 'error', title: 'Error', message: 'Ingrese monto inicial' });
        await fetch('/api/billing/open', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ start_amount: amount, exchange_rate: rate, current_user_id: user?.id, type: sessionType })
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
        try {
            const res = await fetch('/api/billing/movement', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: movementType,
                    amount: moveAmount,
                    description: moveDesc,
                    current_user_id: user?.id,
                    session_type: sessionType
                })
            });
            const data = await res.json();

            if (res.ok) {
                setMoveAmount('');
                setMoveDesc('');
                setAlertInfo({ show: true, type: 'success', title: 'Registrado', message: 'Movimiento guardado.' });
                if (props.setViewMode) props.setViewMode('HISTORY');
                fetchHistory(); // Refresh to show the new item
            } else {
                setAlertInfo({ show: true, type: 'error', title: 'Error', message: data.msg || 'Error al guardar movimiento.' });
            }
        } catch (e) {
            console.error(e);
            setAlertInfo({ show: true, type: 'error', title: 'Error', message: 'Fallo de conexión al registrar movimiento.' });
        }
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
                {/* High-End Session Selector Tabs */}
                <div style={{
                    display: 'flex',
                    gap: '1rem',
                    marginBottom: '2rem',
                    justifyContent: 'center',
                    background: 'rgba(15, 23, 42, 0.6)',
                    padding: '0.6rem',
                    borderRadius: '20px',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    width: 'fit-content',
                    margin: '0 auto 2rem auto'
                }}>
                    <button
                        onClick={() => setSessionType('OFICINA')}
                        className={`btn-session-tab ${sessionType === 'OFICINA' ? 'active office' : ''}`}
                        style={{
                            padding: '1.25rem 2.5rem',
                            borderRadius: '20px',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            fontSize: '1.1rem',
                            fontWeight: '900',
                            transition: 'all 0.5s cubic-bezier(0.19, 1, 0.22, 1)',
                            background: sessionType === 'OFICINA' ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' : 'rgba(255,255,255,0.05)',
                            color: sessionType === 'OFICINA' ? '#fff' : '#94a3b8',
                            boxShadow: sessionType === 'OFICINA' ? '0 15px 35px rgba(37, 99, 235, 0.4)' : 'none',
                            border: '1px solid rgba(255,255,255,0.1)'
                        }}
                    >
                        <FaBuilding style={{ fontSize: '1.4rem' }} />
                        <span>OFICINA CENTRAL</span>
                    </button>
                    <button
                        onClick={() => setSessionType('COBRADOR')}
                        className={`btn-session-tab ${sessionType === 'COBRADOR' ? 'active collectors' : ''}`}
                        style={{
                            padding: '1.25rem 2.5rem',
                            borderRadius: '20px',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            fontSize: '1.1rem',
                            fontWeight: '900',
                            transition: 'all 0.5s cubic-bezier(0.19, 1, 0.22, 1)',
                            background: sessionType === 'COBRADOR' ? 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)' : 'rgba(255,255,255,0.05)',
                            color: sessionType === 'COBRADOR' ? '#fff' : '#94a3b8',
                            boxShadow: sessionType === 'COBRADOR' ? '0 15px 35px rgba(124, 58, 237, 0.4)' : 'none',
                            border: '1px solid rgba(255,255,255,0.1)'
                        }}
                    >
                        <FaMotorcycle style={{ fontSize: '1.4rem' }} />
                        <span>COBRADORES / RUTA</span>
                    </button>
                </div>

                {/* Premium Dashboard Card */}
                <div className="premium-glass-card" style={{
                    padding: 0,
                    overflow: 'hidden',
                    background: 'rgba(15, 23, 42, 0.8)',
                    backdropFilter: 'blur(30px)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    borderRadius: '28px'
                }}>
                    {/* Header con Stats Rápidos */}
                    <div style={{
                        padding: '2.5rem',
                        background: sessionType === 'OFICINA'
                            ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(30, 41, 59, 0) 100%)'
                            : 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(30, 41, 59, 0) 100%)',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '2rem'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                            <div style={{
                                width: '70px',
                                height: '70px',
                                borderRadius: '22px',
                                background: sessionType === 'OFICINA' ? '#3b82f6' : '#8b5cf6',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '2rem',
                                boxShadow: `0 10px 30px ${sessionType === 'OFICINA' ? 'rgba(59, 130, 246, 0.5)' : 'rgba(139, 92, 246, 0.5)'}`
                            }}>
                                    {sessionType === 'OFICINA' ? <FaBuilding /> : <FaMotorcycle />}
                            </div>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: '800', color: 'white', letterSpacing: '-0.5px' }}>
                                    Caja {sessionType === 'OFICINA' ? 'Oficina' : 'Ruta'}
                                </h2>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.4rem' }}>
                                    <span className="badge" style={{ background: '#10b98122', color: '#10b981', border: '1px solid #10b98133', padding: '0.3rem 0.8rem' }}>EN LÍNEA</span>
                                    <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>• {session.opener_name}</span>
                                </div>
                            </div>
                        </div>

                        <div style={{ 
                            background: 'rgba(0,0,0,0.3)', 
                            padding: '1.25rem 2rem', 
                            borderRadius: '24px', 
                            border: '1px solid rgba(255,255,255,0.05)',
                            textAlign: 'right',
                            minWidth: '220px'
                        }}>
                            <small style={{ color: '#64748b', display: 'block', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: '800', letterSpacing: '1px', marginBottom: '0.5rem' }}>FONDO ACTUAL EN CAJA</small>
                            <span style={{ fontSize: '2.25rem', fontWeight: '900', color: '#10b981', display: 'block' }}>
                                <small style={{ fontSize: '1rem', marginRight: '5px' }}>C$</small>
                                {parseFloat(session.start_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>

                    {/* Botones de Acción Estilo Tarjeta */}
                    <div style={{ 
                        padding: '2.5rem', 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
                        gap: '1.5rem' 
                    }}>
                        <button
                            onClick={() => { setMovementType('IN'); props.setViewMode('MOVEMENT_IN'); }}
                            className="dashboard-action-card"
                            style={{
                                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(15, 23, 42, 0) 100%)',
                                color: '#10b981'
                            }}
                        >
                            <div className="icon-wrapper"><FaArrowDown /></div>
                            <div style={{ fontWeight: '900', fontSize: '1.25rem' }}>Entrada</div>
                            <div style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '0.5rem', fontWeight: '500' }}>REGISTRAR INGRESO</div>
                        </button>

                        <button
                            onClick={() => { setMovementType('OUT'); props.setViewMode('MOVEMENT_OUT'); }}
                            className="dashboard-action-card"
                            style={{
                                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(15, 23, 42, 0) 100%)',
                                color: '#ef4444'
                            }}
                        >
                            <div className="icon-wrapper"><FaArrowUp /></div>
                            <div style={{ fontWeight: '900', fontSize: '1.25rem' }}>Salida</div>
                            <div style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '0.5rem', fontWeight: '500' }}>REGISTRAR GASTO</div>
                        </button>

                        <button
                            onClick={() => props.setViewMode('HISTORY')}
                            className="dashboard-action-card"
                            style={{
                                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(15, 23, 42, 0) 100%)',
                                color: '#3b82f6'
                            }}
                        >
                            <div className="icon-wrapper"><FaHistory /></div>
                            <div style={{ fontWeight: '900', fontSize: '1.25rem' }}>Historial</div>
                            <div style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '0.5rem', fontWeight: '500' }}>VER TRANSACCIONES</div>
                        </button>

                        {hasRole(['admin', 'cajero']) && (
                            <button
                                onClick={() => setShowClosePrompt(true)}
                                className="dashboard-action-card"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(15, 23, 42, 0) 100%)',
                                    color: '#f59e0b'
                                }}
                            >
                                <div className="icon-wrapper"><FaLock /></div>
                                <div style={{ fontWeight: '900', fontSize: '1.25rem' }}>Cierre</div>
                                <div style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '0.5rem', fontWeight: '500' }}>FINALIZAR TURNO</div>
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

                {/* Premium Style for hover effects and animations */}
                <style>{`
                    @keyframes glass-shine {
                        0% { transform: translateX(-100%) rotate(45deg); }
                        100% { transform: translateX(200%) rotate(45deg); }
                    }
                    .dashboard-action-card {
                        position: relative;
                        overflow: hidden;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        border: 1px solid rgba(255, 255, 255, 0.08);
                        border-radius: 28px;
                        padding: 2.5rem 1.5rem;
                        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                        cursor: pointer;
                        z-index: 1;
                    }
                    .dashboard-action-card::before {
                        content: '';
                        position: absolute;
                        top: 0; left: 0; width: 100%; height: 100%;
                        background: radial-gradient(circle at top left, rgba(255,255,255,0.1), transparent 70%);
                        opacity: 0; transition: opacity 0.4s;
                        z-index: -1;
                    }
                    .dashboard-action-card:hover {
                        transform: translateY(-8px) scale(1.03);
                        border-color: rgba(255, 255, 255, 0.2);
                        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
                    }
                    .dashboard-action-card:hover::before { opacity: 1; }
                    .dashboard-action-card .icon-wrapper {
                        font-size: 3.5rem;
                        margin-bottom: 1.25rem;
                        filter: drop-shadow(0 0 15px currentColor);
                        transition: transform 0.4s;
                    }
                    .dashboard-action-card:hover .icon-wrapper {
                        transform: rotate(10deg) scale(1.1);
                    }
                    .btn-session-tab {
                        position: relative;
                        overflow: hidden;
                    }
                    .btn-session-tab::after {
                        content: '';
                        position: absolute;
                        top: 0; left: -100%; width: 100%; height: 100%;
                        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
                        transition: 0.5s;
                    }
                    .btn-session-tab:hover::after {
                        left: 100%;
                    }
                    .animate-slide-up { animation: slideUp 0.6s ease-out; }
                    @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } }
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

                                <select
                                    className="input-dark"
                                    value={filterCollector}
                                    onChange={e => setFilterCollector(e.target.value)}
                                    style={{ padding: '0.4rem', fontSize: '0.9rem', maxWidth: '150px' }}
                                >
                                    <option value="">👤 Todos</option>
                                    {users.map(u => (
                                        <option key={u.id} value={u.id}>{u.username}</option>
                                    ))}
                                </select>

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
                )
                }

                {
                    showJustifyPrompt && (
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
                    )
                }

                {receiptTransaction && <ReceiptModal transaction={receiptTransaction} onClose={() => setReceiptTransaction(null)} />}
            </div >
        );
    }

    // Closed Session State
    return (
        <div className="animate-slide-up" style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', gap: '2rem', paddingTop: '2rem' }}>
            {/* High-End Session Selector Tabs */}
            <div style={{
                display: 'flex',
                gap: '1rem',
                justifyContent: 'center',
                background: 'rgba(15, 23, 42, 0.6)',
                padding: '0.6rem',
                borderRadius: '20px',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.05)',
                width: 'fit-content',
                margin: '0 auto'
            }}>
                <button
                    onClick={() => setSessionType('OFICINA')}
                    className={`btn-session-tab ${sessionType === 'OFICINA' ? 'active office' : ''}`}
                    style={{
                        padding: '0.8rem 1.5rem',
                        borderRadius: '15px',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '1rem',
                        fontWeight: '700',
                        transition: 'all 0.3s ease',
                        background: sessionType === 'OFICINA' ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' : 'transparent',
                        color: sessionType === 'OFICINA' ? '#fff' : '#94a3b8',
                        boxShadow: sessionType === 'OFICINA' ? '0 4px 15px rgba(59, 130, 246, 0.4)' : 'none'
                    }}
                >
                    <span style={{ fontSize: '1.4rem' }}>🏢</span>
                    <span>CAJA OFICINA</span>
                </button>
                <button
                    onClick={() => setSessionType('COBRADOR')}
                    className={`btn-session-tab ${sessionType === 'COBRADOR' ? 'active collectors' : ''}`}
                    style={{
                        padding: '0.8rem 1.5rem',
                        borderRadius: '15px',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '1rem',
                        fontWeight: '700',
                        transition: 'all 0.3s ease',
                        background: sessionType === 'COBRADOR' ? 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' : 'transparent',
                        color: sessionType === 'COBRADOR' ? '#fff' : '#94a3b8',
                        boxShadow: sessionType === 'COBRADOR' ? '0 4px 15px rgba(139, 92, 246, 0.4)' : 'none'
                    }}
                >
                    <span style={{ fontSize: '1.4rem' }}>🛵</span>
                    <span>CAJA COBRADORES</span>
                </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div className="premium-glass-card" style={{
                    maxWidth: '450px',
                    width: '90%',
                    padding: '3rem 2rem',
                    textAlign: 'center',
                    background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    {/* Decorative Background Elements */}
                    <div style={{
                        position: 'absolute',
                        top: '-10%',
                        left: '-10%',
                        width: '200px',
                        height: '200px',
                        background: 'radial-gradient(circle, rgba(239, 68, 68, 0.1) 0%, transparent 70%)',
                        filter: 'blur(30px)',
                        pointerEvents: 'none'
                    }}></div>

                    <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
                        <button
                            onClick={() => setShowSettings(true)}
                            className="btn-icon-modern"
                            style={{ background: 'rgba(255,255,255,0.05)', padding: '0.6rem', borderRadius: '12px' }}
                            title="Configuración"
                        >⚙️</button>
                    </div>

                    <div style={{
                        fontSize: '5rem',
                        marginBottom: '1.5rem',
                        filter: 'drop-shadow(0 0 20px rgba(239, 68, 68, 0.3))',
                        animation: 'pulse 3s infinite'
                    }}>🔒</div>

                    <h2 style={{
                        marginBottom: '0.5rem',
                        fontSize: '2rem',
                        fontWeight: '800',
                        background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}>
                        Caja {sessionType === 'OFICINA' ? 'Oficina' : 'Cobradores'} Cerrada
                    </h2>
                    <p className="text-muted" style={{ marginBottom: '2.5rem', fontSize: '1.05rem', opacity: 0.8 }}>
                        Debe abrir un turno para comenzar a cobrar en este módulo.
                    </p>

                    <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '2rem', borderRadius: '20px', marginBottom: '2rem', border: '1px solid rgba(255,255,255,0.03)' }}>
                        <div style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
                            <label className="text-muted" style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                Tasa de Cambio ($1 = C$)
                            </label>
                            <input
                                type="number"
                                step="0.0001"
                                placeholder="36.6243"
                                className="input-dark"
                                style={{ fontSize: '1.25rem', textAlign: 'center', height: '50px', borderRadius: '12px' }}
                                value={rate}
                                onChange={e => setRate(e.target.value)}
                            />
                        </div>
                        <div style={{ textAlign: 'left' }}>
                            <label className="text-muted" style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                Monto Inicial (C$)
                            </label>
                            <input
                                type="number"
                                placeholder="0.00"
                                className="input-dark"
                                style={{
                                    fontSize: '1.75rem',
                                    fontWeight: '800',
                                    color: '#34d399',
                                    textAlign: 'center',
                                    height: '60px',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(52, 211, 153, 0.2)'
                                }}
                                value={amount}
                                autoFocus
                                onChange={e => setAmount(e.target.value)}
                            />
                        </div>
                    </div>

                    {hasRole(['admin', 'cajero']) && (
                        <button
                            onClick={handleOpen}
                            className="btn-action-premium"
                            style={{
                                width: '100%',
                                justifyContent: 'center',
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                color: 'white',
                                border: 'none',
                                padding: '1.25rem',
                                borderRadius: '16px',
                                fontSize: '1.1rem',
                                fontWeight: '800',
                                boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)'
                            }}
                        >
                            🔓 ABRIR TURNO {sessionType}
                        </button>
                    )}
                </div>
            </div>

            <CustomAlert isOpen={alertInfo.show} title={alertInfo.title} message={alertInfo.message} type={alertInfo.type} onClose={() => setAlertInfo({ ...alertInfo, show: false })} />
            {showSettings && <ReceiptSettingsModal onClose={() => setShowSettings(false)} />}

            <style>{`
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.05); opacity: 0.8; }
                    100% { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div >
    );
};

export default CashRegister;

