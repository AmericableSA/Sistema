import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import CustomAlert from './CustomAlert';
import ConfirmModal from './ConfirmModal';
import ReceiptSettingsModal from './ReceiptSettingsModal';
import ReceiptModal from './ReceiptModal';
import * as XLSX from 'xlsx';
import {
    FaCashRegister, FaHandHoldingUsd, FaHistory, FaLock,
    FaArrowUp, FaArrowDown, FaBuilding, FaMotorcycle, FaSyncAlt,
    FaSearch, FaFileExcel, FaCalendarDay, FaCalendarAlt, FaPrint,
    FaBan, FaCheckCircle, FaFileInvoiceDollar, FaUser, FaMoneyBillWave,
    FaFilter, FaTimes, FaCoins, FaCreditCard, FaExchangeAlt
} from 'react-icons/fa';
import styled, { keyframes } from 'styled-components';
import eventBus from '../utils/eventBus';

const CashRegister = (props) => {
    const { hasRole, user } = useAuth();
    const [session, setSession] = useState(null);
    const [stats, setStats] = useState(null);
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
    const [physicalInput, setPhysicalInput] = useState('');

    const [alertInfo, setAlertInfo] = useState({ show: false, title: '', message: '', type: 'info' });

    // History & Filters
    const [history, setHistory] = useState([]);
    const [historySummary, setHistorySummary] = useState({ totalIncome: 0, totalExpense: 0, totalCancelled: 0, netBalance: 0 });
    const [showHistory, setShowHistory] = useState(false);
    const [filterStart, setFilterStart] = useState('');
    const [filterEnd, setFilterEnd] = useState('');
    const [filterCollector, setFilterCollector] = useState('');
    const [filterTxType, setFilterTxType] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterPaymentMethod, setFilterPaymentMethod] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // New Modals
    const [showSettings, setShowSettings] = useState(false);
    const [receiptTransaction, setReceiptTransaction] = useState(null);
    const [cancelTxId, setCancelTxId] = useState(null);

    // Users for Filter
    const [users, setUsers] = useState([]);
    const [sessionType, setSessionType] = useState('GLOBAL'); // 'GLOBAL'

    useEffect(() => {
        fetchStatus();
        fetchHistory();
        fetchUsers();
        if (props.onTypeChange) props.onTypeChange(sessionType);

        const unsubscribe = eventBus.subscribe('GLOBAL_REFRESH', () => {
            fetchStatus();
            fetchHistory();
        });
        return () => unsubscribe();
    }, [sessionType]);

    const setQuickDatePreset = (preset) => {
        const now = new Date();
        const getISO = (d) => d.toLocaleDateString('sv-SE', { timeZone: 'America/Managua' });
        
        if (preset === 'today') {
            const today = getISO(now);
            setFilterStart(today);
            setFilterEnd(today);
        } else if (preset === 'yesterday') {
            const yest = new Date(now);
            yest.setDate(now.getDate() - 1);
            const yStr = getISO(yest);
            setFilterStart(yStr);
            setFilterEnd(yStr);
        } else if (preset === '7days') {
            const past7 = new Date(now);
            past7.setDate(now.getDate() - 6);
            setFilterStart(getISO(past7));
            setFilterEnd(getISO(now));
        } else if (preset === 'month') {
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            setFilterStart(getISO(firstDay));
            setFilterEnd(getISO(now));
        } else if (preset === 'all') {
            setFilterStart('');
            setFilterEnd('');
        }
        setPage(1);
    };

    const handleSearchHistory = () => {
        setPage(1);
        fetchHistory(true);
    };

    const fetchHistory = async (useFilters = false) => {
        try {
            setLoading(true);
            let url = `/api/billing/history?limit=15&page=${page}&session_type=${sessionType}`;
            if (useFilters || filterStart || filterEnd || searchTerm || filterCollector || filterTxType !== 'all' || filterStatus !== 'all' || filterPaymentMethod !== 'all') {
                if (filterStart) url += `&startDate=${filterStart}`;
                if (filterEnd) url += `&endDate=${filterEnd}`;
                if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
                if (filterCollector) url += `&collector=${filterCollector}`;
                if (filterTxType && filterTxType !== 'all') url += `&txType=${filterTxType}`;
                if (filterStatus && filterStatus !== 'all') url += `&status=${filterStatus}`;
                if (filterPaymentMethod && filterPaymentMethod !== 'all') url += `&paymentMethod=${filterPaymentMethod}`;
            }

            const token = localStorage.getItem('token');
            const res = await fetch(url, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            const jsonData = await res.json();

            if (jsonData.data && Array.isArray(jsonData.data)) {
                setHistory(jsonData.data);
                if (jsonData.summary) {
                    setHistorySummary(jsonData.summary);
                }
                if (jsonData.pagination) {
                    setTotalPages(jsonData.pagination.totalPages || 1);
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

    const handleExportHistoryExcel = () => {
        try {
            if (history.length === 0) {
                return setAlertInfo({ show: true, type: 'warning', title: 'Sin Datos', message: 'No hay transacciones para exportar con los filtros actuales.' });
            }
            const rows = history.map(tx => {
                const dateObj = new Date(tx.created_at);
                return {
                    "Fecha": dateObj.toLocaleDateString('es-NI', { timeZone: 'America/Managua' }),
                    "Hora": dateObj.toLocaleTimeString('es-NI', { timeZone: 'America/Managua', hour12: true }),
                    "No. Factura": tx.reference_id || 'S/N',
                    "Cliente": tx.client_name || 'N/A',
                    "No. Contrato": tx.contract_number || 'N/A',
                    "Tipo": tx.type === 'SALE' ? (tx.tx_category || 'Venta') : (tx.type === 'IN' ? 'Entrada' : 'Salida'),
                    "Descripción": tx.description || '',
                    "Método": tx.payment_method === 'cash' ? 'Efectivo' : (tx.payment_method === 'card' ? 'Tarjeta' : (tx.payment_method === 'transfer' ? 'Transferencia' : (tx.payment_method || 'Efectivo'))),
                    "Monto (NIO)": parseFloat(tx.amount || 0),
                    "Estado": tx.status === 'CANCELLED' ? 'ANULADA' : 'COMPLETADA',
                    "Motivo Anulación": tx.cancellation_reason || ''
                };
            });
            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Historial");
            XLSX.writeFile(wb, `Historial_Facturas_${filterStart || 'Todo'}_al_${filterEnd || 'Hoy'}.xlsx`);
        } catch (e) {
            console.error("Error al exportar:", e);
            setAlertInfo({ show: true, type: 'error', title: 'Error', message: 'Error al generar el archivo Excel.' });
        }
    };

    useEffect(() => {
        if (session) fetchHistory();
    }, [page, session, filterTxType, filterStatus, filterPaymentMethod, filterCollector, filterStart, filterEnd]);

    useEffect(() => {
        if (props.viewMode === 'HISTORY') {
            fetchHistory(true);
        }
    }, [props.viewMode]);

    const fetchStats = async () => {
        try {
            const res = await fetch(`/api/billing/stats?type=${sessionType}`);
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            } else {
                setStats(null);
            }
        } catch (e) {
            console.error("Error fetching stats:", e);
            setStats(null);
        }
    };

    const fetchStatus = async () => {
        try {
            const res = await fetch(`/api/billing/status?type=${sessionType}`);
            const data = await res.json();
            setSession(data || null);
            setLoading(false);
            if (props.onSessionChange) props.onSessionChange(!!data);
            if (data) {
                fetchStats();
            } else {
                setStats(null);
            }
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
        try {
            const res = await fetch('/api/billing/close', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: session.id,
                    end_amount_physical: physicalAmount,
                    closing_note: note,
                    current_user_id: user?.id
                })
            });

            let data = {};
            try { data = await res.json(); } catch (e) { data = { msg: 'Error de conexión con el servidor.' }; }

            if (res.status === 400 && data.error === 'JUSTIFICATION_REQUIRED') {
                setClosingData({ physical: physicalAmount, diff: data.difference, system: data.systemTotal });
                setShowClosePrompt(false);
                setShowJustifyPrompt(true);
            } else if (res.ok) {
                setShowClosePrompt(false);
                setShowJustifyPrompt(false);
                setPhysicalInput('');
                setClosingNote('');
                setAlertInfo({ show: true, type: 'success', title: 'Caja Cerrada', message: 'Turno finalizado correctamente.' });
                fetchStatus();
                fetchHistory();
            } else {
                setAlertInfo({ show: true, type: 'error', title: 'Error al Cerrar', message: data.msg || 'No se pudo cerrar la caja. Intente de nuevo.' });
            }
        } catch (e) {
            console.error('Close session network error:', e);
            setAlertInfo({ show: true, type: 'error', title: 'Error de Conexión', message: 'No se pudo conectar con el servidor. Verifique su conexión.' });
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
                eventBus.dispatch('GLOBAL_REFRESH'); // Transmit to the rest of the application
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
                        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(30, 41, 59, 0) 100%)',
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
                                background: '#3b82f6',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '2rem',
                                boxShadow: '0 10px 30px rgba(59, 130, 246, 0.5)'
                            }}>
                                <FaCashRegister />
                            </div>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: '800', color: 'white', letterSpacing: '-0.5px' }}>
                                    Caja Global
                                </h2>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.4rem' }}>
                                    <span className="badge" style={{ background: '#10b98122', color: '#10b981', border: '1px solid #10b98133', padding: '0.3rem 0.8rem' }}>EN LÍNEA</span>
                                    <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>• {session.opener_name}</span>
                                    <button 
                                        onClick={() => { fetchStatus(); fetchHistory(); }}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: '#64748b',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            fontSize: '0.9rem',
                                            padding: '0.2rem',
                                            borderRadius: '6px',
                                            transition: 'color 0.2s'
                                        }}
                                        onMouseEnter={e => e.target.style.color = '#fff'}
                                        onMouseLeave={e => e.target.style.color = '#64748b'}
                                        title="Actualizar Estadísticas"
                                    >
                                        <FaSyncAlt />
                                    </button>
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
                            <small style={{ color: '#64748b', display: 'block', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: '800', letterSpacing: '1px', marginBottom: '0.5rem' }}>FONDO INICIAL</small>
                            <span style={{ fontSize: '2.25rem', fontWeight: '900', color: '#fbbf24', display: 'block' }}>
                                <small style={{ fontSize: '1rem', marginRight: '5px' }}>C$</small>
                                {parseFloat(session.start_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>

                    {/* Stats Breakdown Section */}
                    {stats && (
                        <div style={{ padding: '0 2.5rem 1rem 2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {/* Highlights Row */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                                gap: '1.5rem'
                            }}>
                                {/* Card 1: Efectivo Esperado en Gaveta */}
                                <div style={{
                                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.02) 100%)',
                                    border: '1px solid rgba(16, 185, 129, 0.2)',
                                    padding: '1.5rem',
                                    borderRadius: '20px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1rem',
                                    boxShadow: '0 10px 20px rgba(0,0,0,0.15)'
                                }}>
                                    <div style={{ fontSize: '2.5rem' }}>💵</div>
                                    <div>
                                        <small style={{ color: '#a7f3d0', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Efectivo en Gaveta (Debe Haber)</small>
                                        <span style={{ display: 'block', fontSize: '1.8rem', fontWeight: '900', color: '#34d399', marginTop: '0.25rem' }}>
                                            C$ {Number(stats.cash_in_drawer || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>

                                {/* Card 2: Total General Cobrado */}
                                <div style={{
                                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.02) 100%)',
                                    border: '1px solid rgba(59, 130, 246, 0.2)',
                                    padding: '1.5rem',
                                    borderRadius: '20px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1rem',
                                    boxShadow: '0 10px 20px rgba(0,0,0,0.15)'
                                }}>
                                    <div style={{ fontSize: '2.5rem' }}>📈</div>
                                    <div>
                                        <small style={{ color: '#93c5fd', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total General Cobrado</small>
                                        <span style={{ display: 'block', fontSize: '1.8rem', fontWeight: '900', color: '#60a5fa', marginTop: '0.25rem' }}>
                                            C$ {Number(stats.total_collected || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>

                                {/* Card 3: Tasa de Cambio */}
                                <div style={{
                                    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.02) 100%)',
                                    border: '1px solid rgba(245, 158, 11, 0.2)',
                                    padding: '1.5rem',
                                    borderRadius: '20px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1rem',
                                    boxShadow: '0 10px 20px rgba(0,0,0,0.15)'
                                }}>
                                    <div style={{ fontSize: '2.5rem' }}>🔑</div>
                                    <div>
                                        <small style={{ color: '#fde047', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tasa de Cambio</small>
                                        <span style={{ display: 'block', fontSize: '1.8rem', fontWeight: '900', color: '#fbbf24', marginTop: '0.25rem' }}>
                                            C$ {Number(stats.exchange_rate || 37).toFixed(4)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Detailed Breakdown Grid */}
                            <div style={{
                                background: 'rgba(30, 41, 59, 0.3)',
                                border: '1px solid rgba(255,255,255,0.04)',
                                borderRadius: '24px',
                                padding: '1.5rem',
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                gap: '1.25rem',
                                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
                            }}>
                                <div>
                                    <small style={{ color: '#94a3b8', fontSize: '0.75rem', display: 'block' }}>💵 Cobros Efectivo (C$)</small>
                                    <span style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 'bold' }}>
                                        C$ {Number(stats.sales_cash || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <div>
                                    <small style={{ color: '#94a3b8', fontSize: '0.75rem', display: 'block' }}>💵 Cobros Dólares (U$)</small>
                                    <span style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 'bold' }}>
                                        $ {Number(stats.sales_dollars || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                        <small style={{ fontSize: '0.8rem', color: '#10b981', marginLeft: '5px' }}>
                                            (C$ {Number(stats.dollars_in_cordobas || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })})
                                        </small>
                                    </span>
                                </div>
                                <div>
                                    <small style={{ color: '#94a3b8', fontSize: '0.75rem', display: 'block' }}>💳 Cobros Tarjeta (C$)</small>
                                    <span style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 'bold' }}>
                                        C$ {Number(stats.sales_card || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <div>
                                    <small style={{ color: '#94a3b8', fontSize: '0.75rem', display: 'block' }}>🏦 Cobros Transferencias (C$)</small>
                                    <span style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 'bold' }}>
                                        C$ {Number(stats.sales_transfer || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <div>
                                    <small style={{ color: '#10b981', fontSize: '0.75rem', display: 'block' }}>📥 Entradas Manuales</small>
                                    <span style={{ color: '#34d399', fontSize: '1.1rem', fontWeight: 'bold' }}>
                                        + C$ {Number(stats.manual_in || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <div>
                                    <small style={{ color: '#f87171', fontSize: '0.75rem', display: 'block' }}>📤 Salidas Manuales</small>
                                    <span style={{ color: '#f87171', fontSize: '1.1rem', fontWeight: 'bold' }}>
                                        - C$ {Number(stats.manual_out || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <div>
                                    <small style={{ color: '#fca5a5', fontSize: '0.75rem', display: 'block' }}>🚫 Devoluciones / Anulaciones</small>
                                    <span style={{ color: '#fca5a5', fontSize: '1.1rem', fontWeight: 'bold' }}>
                                        - C$ {Number(stats.refunds || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

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
                {/* Custom closing modal with stats breakdown and live physical-vs-system comparison */}
                {showClosePrompt && stats && (
                    <div className="modal-overlay" style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(15, 23, 42, 0.85)',
                        backdropFilter: 'blur(10px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: '1rem'
                    }}>
                        <div className="glass-card" style={{
                            width: '100%',
                            maxWidth: '650px',
                            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.98) 0%, rgba(15, 23, 42, 0.99) 100%)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '24px',
                            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                            padding: '2.5rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1.5rem',
                            color: 'white',
                            maxHeight: '95vh',
                            overflowY: 'auto'
                        }}>
                            {/* Modal Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '1rem' }}>
                                <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    🔒 Cierre de Turno — Caja Global
                                </h3>
                                <button
                                    onClick={() => { setShowClosePrompt(false); setPhysicalInput(''); setClosingNote(''); }}
                                    style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.8rem', cursor: 'pointer' }}
                                >×</button>
                            </div>

                            {/* Session Summary Info */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '1rem',
                                background: 'rgba(255,255,255,0.02)',
                                padding: '1rem',
                                borderRadius: '14px',
                                fontSize: '0.9rem',
                                border: '1px solid rgba(255,255,255,0.03)'
                            }}>
                                <div>
                                    <span className="text-muted" style={{ display: 'block', fontSize: '0.85rem' }}>Apertura por:</span>
                                    <strong>{session.opener_name}</strong>
                                </div>
                                <div>
                                    <span className="text-muted" style={{ display: 'block', fontSize: '0.85rem' }}>Hora de Inicio:</span>
                                    <strong>{new Date(session.start_time).toLocaleString('es-NI', { timeZone: 'America/Managua' })}</strong>
                                </div>
                            </div>

                            {/* System Balance breakdown */}
                            <div>
                                <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '1.05rem', color: '#60a5fa', fontWeight: '700' }}>📊 Desglose de Caja en Sistema</h4>
                                <div style={{
                                    background: 'rgba(0,0,0,0.25)',
                                    borderRadius: '16px',
                                    padding: '1.25rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.6rem',
                                    fontSize: '0.9rem'
                                }}>
                                    <div className="flex-between">
                                        <span className="text-muted">Fondo Inicial:</span>
                                        <span>C$ {parseFloat(stats.start_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex-between">
                                        <span className="text-muted">Cobros en Efectivo (C$):</span>
                                        <span>+ C$ {parseFloat(stats.sales_cash || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex-between">
                                        <span className="text-muted">Cobros en Dólares ($):</span>
                                        <span>
                                            + $ {parseFloat(stats.sales_dollars || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} 
                                            <span style={{ color: '#10b981', marginLeft: '5px' }}>
                                                (C$ {parseFloat(stats.dollars_in_cordobas || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })})
                                            </span>
                                        </span>
                                    </div>
                                    <div className="flex-between">
                                        <span className="text-muted">Movimientos de Entrada:</span>
                                        <span style={{ color: '#34d399' }}>+ C$ {parseFloat(stats.manual_in || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex-between">
                                        <span className="text-muted">Movimientos de Salida:</span>
                                        <span style={{ color: '#f87171' }}>- C$ {parseFloat(stats.manual_out || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex-between">
                                        <span className="text-muted">Anulaciones / Devoluciones:</span>
                                        <span style={{ color: '#fca5a5' }}>- C$ {parseFloat(stats.refunds || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex-between" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.6rem', fontWeight: 'bold' }}>
                                        <span className="text-white">EFECTIVO ESPERADO EN GAVETA:</span>
                                        <span style={{ color: '#eab308', fontSize: '1.2rem' }}>C$ {parseFloat(stats.cash_in_drawer || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex-between" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.6rem', fontSize: '0.85rem' }}>
                                        <span className="text-muted">Cobros Tarjeta (Banco):</span>
                                        <span style={{ color: '#cbd5e1' }}>C$ {parseFloat(stats.sales_card || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex-between" style={{ fontSize: '0.85rem' }}>
                                        <span className="text-muted">Cobros Transferencias (Banco):</span>
                                        <span style={{ color: '#cbd5e1' }}>C$ {parseFloat(stats.sales_transfer || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex-between" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.6rem', fontWeight: '800' }}>
                                        <span style={{ color: '#60a5fa' }}>TOTAL GENERAL COBRADO (Lleva):</span>
                                        <span style={{ color: '#60a5fa', fontSize: '1.2rem' }}>C$ {parseFloat(stats.total_collected || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                </div>
                            </div>

                            {/* User Input Section */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#cbd5e1' }}>
                                        💵 Efectivo Físico Contado (C$)
                                    </label>
                                    <input
                                        type="number"
                                        className="input-dark"
                                        value={physicalInput}
                                        onChange={e => setPhysicalInput(e.target.value)}
                                        placeholder="Digite el monto total contado..."
                                        autoFocus
                                        style={{
                                            fontSize: '1.75rem',
                                            fontWeight: '800',
                                            textAlign: 'center',
                                            color: '#34d399',
                                            border: '1px solid rgba(52, 211, 153, 0.4)',
                                            height: '60px',
                                            borderRadius: '12px',
                                            background: 'rgba(52, 211, 153, 0.05)'
                                        }}
                                    />
                                </div>

                                {/* Live Difference Display */}
                                {physicalInput !== '' && (() => {
                                    const diff = parseFloat(physicalInput) - stats.cash_in_drawer;
                                    const absDiff = Math.abs(diff);
                                    const isMismatched = absDiff > 0.99;
                                    
                                    return (
                                        <div style={{
                                            padding: '1rem',
                                            borderRadius: '12px',
                                            border: '1px solid ' + (isMismatched ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'),
                                            background: isMismatched ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '0.25rem',
                                            alignItems: 'center'
                                        }}>
                                            <div style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>Diferencia calculada:</div>
                                            <div style={{
                                                fontSize: '1.5rem',
                                                fontWeight: '900',
                                                color: isMismatched ? (diff > 0 ? '#38bdf8' : '#f87171') : '#34d399'
                                            }}>
                                                {diff === 0 ? 'C$ 0.00 (Cuadrado)' : (diff > 0 ? '+ C$ ' : '- C$ ') + absDiff.toFixed(2)}
                                            </div>
                                            {isMismatched && (
                                                <div style={{ fontSize: '0.85rem', color: '#fca5a5', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <span>⚠️</span>
                                                    <span>
                                                        {diff > 0 
                                                            ? 'Sobrante detectado en caja. Justificación requerida.' 
                                                            : 'Faltante detectado en caja. Justificación requerida.'
                                                        }
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}

                                {/* Justification Text Area (shows up if difference exists) */}
                                {physicalInput !== '' && Math.abs(parseFloat(physicalInput) - stats.cash_in_drawer) > 0.99 && (
                                    <div className="animate-slide-up">
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#fbbf24' }}>
                                            📝 Nota de Justificación (Obligatoria)
                                        </label>
                                        <textarea
                                            className="input-dark"
                                            rows="3"
                                            value={closingNote}
                                            onChange={e => setClosingNote(e.target.value)}
                                            placeholder="Describa la razón de la diferencia..."
                                            style={{
                                                borderColor: 'rgba(251, 191, 36, 0.4)',
                                                fontSize: '0.95rem',
                                                padding: '0.75rem',
                                                borderRadius: '10px'
                                            }}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Modal Action Buttons */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: '1rem',
                                marginTop: '1rem',
                                borderTop: '1px solid rgba(255,255,255,0.06)',
                                paddingTop: '1.25rem'
                            }}>
                                <button
                                    onClick={() => { setShowClosePrompt(false); setPhysicalInput(''); setClosingNote(''); }}
                                    className="btn-secondary"
                                    style={{ padding: '0.75rem 1.5rem', borderRadius: '10px' }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => attemptClose(parseFloat(physicalInput), closingNote)}
                                    disabled={
                                        physicalInput === '' || 
                                        isNaN(parseFloat(physicalInput)) || 
                                        (Math.abs(parseFloat(physicalInput) - stats.cash_in_drawer) > 0.99 && !closingNote.trim())
                                    }
                                    className="btn-dark-glow"
                                    style={{
                                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                        color: '#000',
                                        fontWeight: '800',
                                        padding: '0.75rem 2rem',
                                        borderRadius: '10px',
                                        cursor: 'pointer',
                                        opacity: (physicalInput === '' || isNaN(parseFloat(physicalInput)) || (Math.abs(parseFloat(physicalInput) - stats.cash_in_drawer) > 0.99 && !closingNote.trim())) ? 0.5 : 1
                                    }}
                                >
                                    PROCESAR CIERRE DE CAJA
                                </button>
                            </div>
                        </div>
                    </div>
                )}
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
                        <div className="glass-panel" style={{ width: '100%', padding: '0', overflow: 'hidden', borderRadius: '24px', display: 'flex', flexDirection: 'column', background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            {/* Header */}
                            <div className="flex-between" style={{ padding: '1.5rem 2rem', background: '#0f172a', borderBottom: '1px solid rgba(255,255,255,0.08)', flexWrap: 'wrap', gap: '1rem' }}>
                                <div className="flex-center" style={{ gap: '12px' }}>
                                    <div style={{ background: 'rgba(59, 130, 246, 0.15)', padding: '0.75rem', borderRadius: '14px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                                        <FaFileInvoiceDollar size={24} color="#60a5fa" />
                                    </div>
                                    <div>
                                        <h3 className="text-white" style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800 }}>
                                            Historial & Bitácora de Facturas
                                        </h3>
                                        <small style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                                            Búsqueda por cliente, fechas, tipo de cobro y estado
                                        </small>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                    <button
                                        onClick={handleExportHistoryExcel}
                                        className="btn-dark-glow"
                                        style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px', padding: '0.5rem 1rem', fontSize: '0.85rem', fontWeight: '700' }}
                                    >
                                        <FaFileExcel /> Exportar Excel
                                    </button>
                                    <button onClick={() => props.setViewMode('SEARCH')} className="btn-icon-close" title="Cerrar Historial">×</button>
                                </div>
                            </div>

                            {/* Summary KPI Cards */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                gap: '1rem',
                                padding: '1.25rem 2rem',
                                background: 'rgba(30, 41, 59, 0.5)',
                                borderBottom: '1px solid rgba(255,255,255,0.06)'
                            }}>
                                <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '14px', padding: '0.9rem 1.25rem' }}>
                                    <div style={{ color: '#6ee7b7', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        💵 Ingresos Cobrados
                                    </div>
                                    <div style={{ color: '#34d399', fontSize: '1.35rem', fontWeight: '900', marginTop: '4px' }}>
                                        C$ {historySummary.totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </div>
                                </div>

                                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '14px', padding: '0.9rem 1.25rem' }}>
                                    <div style={{ color: '#fca5a5', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        💸 Egresos / Salidas
                                    </div>
                                    <div style={{ color: '#f87171', fontSize: '1.35rem', fontWeight: '900', marginTop: '4px' }}>
                                        C$ {historySummary.totalExpense.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </div>
                                </div>

                                <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '14px', padding: '0.9rem 1.25rem' }}>
                                    <div style={{ color: '#fde68a', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        🚫 Facturas Anuladas
                                    </div>
                                    <div style={{ color: '#fbbf24', fontSize: '1.35rem', fontWeight: '900', marginTop: '4px' }}>
                                        C$ {historySummary.totalCancelled.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </div>
                                </div>

                                <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '14px', padding: '0.9rem 1.25rem' }}>
                                    <div style={{ color: '#93c5fd', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        ⚖️ Balance Neto
                                    </div>
                                    <div style={{ color: historySummary.netBalance >= 0 ? '#60a5fa' : '#ef4444', fontSize: '1.35rem', fontWeight: '900', marginTop: '4px' }}>
                                        C$ {historySummary.netBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </div>
                                </div>
                            </div>

                            {/* Quick Date Chips */}
                            <div style={{ padding: '0.75rem 2rem', background: '#1e293b', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: '700', marginRight: '4px' }}>
                                    <FaCalendarDay /> Accesos rápidos:
                                </span>
                                <button onClick={() => setQuickDatePreset('today')} className="btn-letter" style={{ padding: '0.35rem 0.75rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '700', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                                    ⚡ Hoy
                                </button>
                                <button onClick={() => setQuickDatePreset('yesterday')} className="btn-letter" style={{ padding: '0.35rem 0.75rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '700', background: 'rgba(255,255,255,0.05)', color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    🗓️ Ayer
                                </button>
                                <button onClick={() => setQuickDatePreset('7days')} className="btn-letter" style={{ padding: '0.35rem 0.75rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '700', background: 'rgba(255,255,255,0.05)', color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    📅 Últimos 7 Días
                                </button>
                                <button onClick={() => setQuickDatePreset('month')} className="btn-letter" style={{ padding: '0.35rem 0.75rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '700', background: 'rgba(255,255,255,0.05)', color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    🗓️ Este Mes
                                </button>
                                <button onClick={() => setQuickDatePreset('all')} className="btn-letter" style={{ padding: '0.35rem 0.75rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '700', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    ♾️ Todo
                                </button>
                            </div>

                            {/* Detailed Filters Bar */}
                            <div style={{ padding: '1rem 2rem', background: '#0f172a', gap: '0.75rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                {/* Date Range */}
                                <div className="flex-center filters-container" style={{ gap: '0.5rem', background: 'rgba(0,0,0,0.3)', padding: '0.4rem 0.6rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
                                    <input type="date" className="input-dark" value={filterStart} onChange={e => setFilterStart(e.target.value)} style={{ padding: '0.35rem', fontSize: '0.85rem' }} />
                                    <span className="text-muted">→</span>
                                    <input type="date" className="input-dark" value={filterEnd} onChange={e => setFilterEnd(e.target.value)} style={{ padding: '0.35rem', fontSize: '0.85rem' }} />
                                </div>

                                {/* Type Selector */}
                                <select
                                    className="input-dark"
                                    value={filterTxType}
                                    onChange={e => { setFilterTxType(e.target.value); setPage(1); }}
                                    style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem', minWidth: '150px' }}
                                >
                                    <option value="all">🏷️ Todos los Tipos</option>
                                    <option value="monthly_fee">📅 Mensualidad</option>
                                    <option value="materials">📦 Venta Materiales / Combos</option>
                                    <option value="installation">📡 Instalación</option>
                                    <option value="reconnection">🔌 Reconexión</option>
                                    <option value="IN">📥 Entradas Manuales</option>
                                    <option value="OUT">📤 Salidas Manuales</option>
                                </select>

                                {/* Method Selector */}
                                <select
                                    className="input-dark"
                                    value={filterPaymentMethod}
                                    onChange={e => { setFilterPaymentMethod(e.target.value); setPage(1); }}
                                    style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem', minWidth: '140px' }}
                                >
                                    <option value="all">💳 Todos los Métodos</option>
                                    <option value="cash">💵 Efectivo</option>
                                    <option value="card">💳 Tarjeta</option>
                                    <option value="transfer">🏦 Transferencia</option>
                                </select>

                                {/* Status Selector */}
                                <select
                                    className="input-dark"
                                    value={filterStatus}
                                    onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
                                    style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem', minWidth: '130px' }}
                                >
                                    <option value="all">📊 Todos los Estados</option>
                                    <option value="SUCCESS">✅ Exitosas</option>
                                    <option value="CANCELLED">🚫 Anuladas</option>
                                </select>

                                {/* Collector Selector */}
                                <select
                                    className="input-dark"
                                    value={filterCollector}
                                    onChange={e => { setFilterCollector(e.target.value); setPage(1); }}
                                    style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem', maxWidth: '140px' }}
                                >
                                    <option value="">👤 Todos los Cobradores</option>
                                    {users.map(u => (
                                        <option key={u.id} value={u.id}>{u.username}</option>
                                    ))}
                                </select>

                                {/* Search Bar */}
                                <div style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: '220px' }}>
                                    <div style={{ position: 'relative', width: '100%' }}>
                                        <input
                                            type="text"
                                            placeholder="Buscar cliente, contrato, factura..."
                                            className="input-dark"
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleSearchHistory()}
                                            style={{ paddingRight: '2.5rem', fontSize: '0.85rem' }}
                                        />
                                        <button onClick={handleSearchHistory} className="search-icon-btn" style={{ padding: '0 0.6rem' }}>🔍</button>
                                    </div>
                                </div>
                            </div>

                            {/* Data Table */}
                            <div style={{ padding: '0', overflowX: 'auto', flex: 1, overflowY: 'auto', minHeight: '320px', WebkitOverflowScrolling: 'touch' }}>
                                <table className="table-tuani" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: '950px' }}>
                                    <thead>
                                        <tr style={{ background: 'rgba(15, 23, 42, 0.9)' }}>
                                            <th style={{ padding: '1rem' }}>Fecha / Hora</th>
                                            <th style={{ padding: '1rem' }}>Factura #</th>
                                            <th style={{ padding: '1rem' }}>Cliente & Contrato</th>
                                            <th style={{ padding: '1rem' }}>Tipo & Detalle</th>
                                            <th style={{ padding: '1rem' }}>Método</th>
                                            <th style={{ padding: '1rem', textAlign: 'right' }}>Monto</th>
                                            <th style={{ padding: '1rem', textAlign: 'center' }}>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr><td colSpan="7" className="text-center" style={{ padding: '4rem' }}><div className="spinner"></div></td></tr>
                                        ) : history.length === 0 ? (
                                            <tr>
                                                <td colSpan="7" className="text-center" style={{ padding: '4rem' }}>
                                                    <div style={{ fontSize: '3rem', marginBottom: '0.5rem', opacity: 0.5 }}>📭</div>
                                                    <p className="text-muted" style={{ margin: 0 }}>No se encontraron registros con los filtros seleccionados.</p>
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
                                                        background: isCancelled ? 'rgba(15, 23, 42, 0.4)' : undefined,
                                                        borderBottom: '1px solid rgba(255,255,255,0.04)'
                                                    }}>
                                                        <td style={{ padding: '0.9rem 1rem', fontSize: '0.85rem' }}>
                                                            <div style={{ fontWeight: '700', color: isCancelled ? '#cbd5e1' : '#f8fafc', textDecoration: isCancelled ? 'line-through' : 'none' }}>
                                                                {dateObj.toLocaleDateString('es-NI', { timeZone: 'America/Managua', day: '2-digit', month: 'short', year: 'numeric' })}
                                                            </div>
                                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                                                {dateObj.toLocaleTimeString('es-NI', { timeZone: 'America/Managua', hour12: true, hour: '2-digit', minute: '2-digit' })}
                                                            </div>
                                                        </td>

                                                        <td style={{ padding: '0.9rem 1rem' }}>
                                                            <span style={{
                                                                background: isCancelled ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                                                color: isCancelled ? '#f87171' : '#fbbf24',
                                                                border: isCancelled ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
                                                                padding: '0.25rem 0.55rem',
                                                                borderRadius: '6px',
                                                                fontWeight: '800',
                                                                fontSize: '0.85rem',
                                                                textDecoration: isCancelled ? 'line-through' : 'none'
                                                            }}>
                                                                #{tx.reference_id || 'S/N'}
                                                            </span>
                                                        </td>

                                                        <td style={{ padding: '0.9rem 1rem' }}>
                                                            {tx.client_name ? (
                                                                <div>
                                                                    <div style={{ color: isCancelled ? '#94a3b8' : '#f1f5f9', fontWeight: '700', fontSize: '0.95rem', textDecoration: isCancelled ? 'line-through' : 'none' }}>
                                                                        {tx.client_name}
                                                                    </div>
                                                                    {tx.contract_number && (
                                                                        <div style={{ fontSize: '0.75rem', color: '#60a5fa' }}>
                                                                            Contrato: <strong>{tx.contract_number}</strong>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.85rem' }}>Movimiento de Caja</span>
                                                            )}
                                                        </td>

                                                        <td style={{ padding: '0.9rem 1rem' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                                {isCancelled ? (
                                                                    <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
                                                                        ANULADO
                                                                    </span>
                                                                ) : (
                                                                    <span className={`badge ${isIncome ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.75rem' }}>
                                                                        {tx.type === 'SALE' ? (tx.tx_category === 'monthly_fee' ? 'Mensualidad' : (tx.tx_category || 'Venta')) : tx.type}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div style={{ fontSize: '0.8rem', color: isCancelled ? '#fca5a5' : '#cbd5e1', marginTop: '3px', textDecoration: isCancelled ? 'line-through' : 'none' }}>
                                                                {tx.description}
                                                            </div>
                                                            {isCancelled && tx.cancellation_reason && (
                                                                <div style={{ fontSize: '0.75rem', color: '#ef4444', fontStyle: 'italic', marginTop: '2px' }}>
                                                                    Motivo: {tx.cancellation_reason}
                                                                </div>
                                                            )}
                                                        </td>

                                                        <td style={{ padding: '0.9rem 1rem' }}>
                                                            <span style={{
                                                                background: 'rgba(255,255,255,0.05)',
                                                                color: '#cbd5e1',
                                                                padding: '0.2rem 0.5rem',
                                                                borderRadius: '6px',
                                                                fontSize: '0.75rem',
                                                                fontWeight: '600',
                                                                border: '1px solid rgba(255,255,255,0.08)'
                                                            }}>
                                                                {tx.payment_method === 'cash' ? '💵 Efectivo' : (tx.payment_method === 'card' ? '💳 Tarjeta' : (tx.payment_method === 'transfer' ? '🏦 Transferencia' : (tx.payment_method || 'Efectivo')))}
                                                            </span>
                                                        </td>

                                                        <td className="text-right" style={{ padding: '0.9rem 1rem' }}>
                                                            <span style={{
                                                                fontSize: '1.15rem',
                                                                fontWeight: '800',
                                                                color: isCancelled ? '#ef4444' : (isIncome ? '#34d399' : '#f87171'),
                                                                textDecoration: isCancelled ? 'line-through' : 'none'
                                                            }}>
                                                                {isIncome ? '+' : '-'} C$ {Number(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                            </span>
                                                        </td>

                                                        <td className="text-center" style={{ padding: '0.9rem 1rem' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                                                                {isSale && !isCancelled && (
                                                                    <button
                                                                        onClick={() => handleReprint(tx.id)}
                                                                        className="btn-icon-soft"
                                                                        title="Reimprimir Recibo"
                                                                        style={{ padding: '0.4rem 0.6rem', background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#60a5fa' }}
                                                                    >
                                                                        <FaPrint size={13} />
                                                                    </button>
                                                                )}
                                                                {!isCancelled && isSale && (
                                                                    <button
                                                                        onClick={() => setCancelTxId(tx.id)}
                                                                        className="btn-icon-soft"
                                                                        title="Anular Factura"
                                                                        style={{ color: '#f87171', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '0.4rem 0.6rem' }}
                                                                    >
                                                                        <FaBan size={13} />
                                                                    </button>
                                                                )}
                                                                {isCancelled && (
                                                                    <span style={{ fontSize: '1.1rem', color: '#ef4444' }} title="Factura Anulada">🚫</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination Footer */}
                            <div className="flex-between" style={{ padding: '1rem 2rem', borderTop: '1px solid rgba(255,255,255,0.06)', background: '#0f172a' }}>
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

