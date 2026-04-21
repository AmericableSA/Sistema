
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
// @ts-ignore
import CustomAlert from '../components/CustomAlert';
import HistoryModal from '../components/HistoryModal';
import WebNotificationsModal from '../components/WebNotificationsModal';
import FullPageLoader from '../components/FullPageLoader';
import MaterialsModal from '../components/MaterialsModal';

const STATUS_CONFIG = {
    PENDING:     { label: 'Pendiente',   color: '#f59e0b', bg: 'rgba(245,158,11,0.15)',   border: 'rgba(245,158,11,0.4)'   },
    IN_PROGRESS: { label: 'En Proceso',  color: '#3b82f6', bg: 'rgba(59,130,246,0.15)',   border: 'rgba(59,130,246,0.4)'   },
    COMPLETED:   { label: 'Finalizada',  color: '#10b981', bg: 'rgba(16,185,129,0.15)',   border: 'rgba(16,185,129,0.4)'   },
    CANCELLED:   { label: 'Cancelada',   color: '#ef4444', bg: 'rgba(239,68,68,0.15)',    border: 'rgba(239,68,68,0.4)'    },
    FINALIZADO:  { label: 'Finalizado',  color: '#10b981', bg: 'rgba(16,185,129,0.15)',   border: 'rgba(16,185,129,0.4)'   },
    PENDIENTE:   { label: 'Pendiente',   color: '#f59e0b', bg: 'rgba(245,158,11,0.15)',   border: 'rgba(245,158,11,0.4)'   },
    ATENDIDO:    { label: 'Atendido',    color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)',   border: 'rgba(139,92,246,0.4)'   },
};

const StatusBadge = ({ status }) => {
    const cfg = STATUS_CONFIG[status] || { label: status || 'Registrado', color: '#94a3b8', bg: 'rgba(148,163,184,0.15)', border: 'rgba(148,163,184,0.3)' };
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
            padding: '0.3rem 0.75rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700,
            background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
            whiteSpace: 'nowrap'
        }}>
            {cfg.label}
        </span>
    );
};

const ACTION_TILES = [
    { action: 'INSTALLATION',  icon: '📡', label: 'Nueva Instalación',      desc: 'Crear orden de instalación',         color: '#3b82f6', border: 'rgba(59,130,246,0.3)',  bg: 'rgba(59,130,246,0.06)'  },
    { action: 'CHANGE_NAME',   icon: '📝', label: 'Cambio de Nombre',       desc: 'Corregir titular del contrato',      color: '#8b5cf6', border: 'rgba(139,92,246,0.3)', bg: 'rgba(139,92,246,0.06)' },
    { action: 'CHANGE_ADDRESS',icon: '📍', label: 'Cambio de Dirección',    desc: 'Traslado del servicio',              color: '#06b6d4', border: 'rgba(6,182,212,0.3)',   bg: 'rgba(6,182,212,0.06)'  },
    { action: 'DISCONNECT_REQ',icon: '✂️', label: 'Baja Voluntaria',        desc: 'Cliente solicita desconexión',       color: '#ef4444', border: 'rgba(239,68,68,0.3)',   bg: 'rgba(239,68,68,0.06)'  },
    { action: 'DISCONNECT_MORA',icon: '⚖️',label: 'Corte por Mora',         desc: 'Suspensión por falta de pago',       color: '#f97316', border: 'rgba(249,115,22,0.3)',  bg: 'rgba(249,115,22,0.06)' },
    { action: 'REPAIR',        icon: '🔧', label: 'Reportar Avería',         desc: 'Crear orden de reparación',          color: '#eab308', border: 'rgba(234,179,8,0.3)',   bg: 'rgba(234,179,8,0.06)'  },
    { action: 'RECONNECT',     icon: '🔌', label: 'Reconexión',              desc: 'Restablecer servicio cortado',       color: '#10b981', border: 'rgba(16,185,129,0.3)',  bg: 'rgba(16,185,129,0.06)' },
];

const ClientMovements = () => {
    // Data State
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filter State
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [letterFilter, setLetterFilter] = useState('');

    // UI Selection State
    const [selectedClient, setSelectedClient] = useState(null);
    const [selectedAction, setSelectedAction] = useState('');

    // Form State
    const [formValue, setFormValue] = useState('');
    const [formReason, setFormReason] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    // Order State
    const [orders, setOrders] = useState([]);
    const [techs, setTechs] = useState([]);
    const [loadingOrders, setLoadingOrders] = useState(false);

    // ✅ Bug 7: Save Button State — pending changes per order (no auto-save)
    const [pendingChanges, setPendingChanges] = useState({}); // { orderId: { field: value, ... } }
    const [savingOrderId, setSavingOrderId] = useState(null);

    // Daily Orders State
    const [dailyOrders, setDailyOrders] = useState([]);
    const [loadingDaily, setLoadingDaily] = useState(false);

    // Optional Date Filters
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

    // History Modal State
    const [showHistory, setShowHistory] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [notificationCount, setNotificationCount] = useState(0);

    // Materials Modal
    const [showMaterialsModal, setShowMaterialsModal] = useState(false);
    const [selectedOrderForMaterials, setSelectedOrderForMaterials] = useState(null);

    const [alert, setAlert] = useState({ show: false, title: '', message: '', type: 'info' });

    // Debounce Search
    useEffect(() => {
        const timer = setTimeout(() => { setDebouncedSearch(search); }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    // Fetch Clients
    useEffect(() => {
        const fetchClients = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams({ page: 1, limit: 50, search: debouncedSearch, start_letter: letterFilter, status: 'all' });
                const res = await fetch(`/api/clients?${params.toString()}`, { cache: 'no-store' });
                const data = await res.json();
                setClients(data.clients ? data.clients : []);
            } catch (err) {
                console.error(err);
                setClients([]);
            } finally { setLoading(false); }
        };
        fetchClients();
    }, [debouncedSearch, letterFilter]);

    // Check Notifications Count
    useEffect(() => {
        const checkNotifs = async () => {
            try {
                const resA = await fetch('/api/notifications/averias?status=Pendiente');
                const dataA = await resA.json();
                const resC = await fetch('/api/notifications/contactos?status=pending');
                const dataC = await resC.json();
                setNotificationCount((Array.isArray(dataA) ? dataA.length : 0) + (Array.isArray(dataC) ? dataC.length : 0));
            } catch (e) { }
        };
        checkNotifs();
    }, []);

    const handleSelectClient = (client) => {
        setSelectedClient(client);
        setSelectedAction('');
        setFormValue('');
        setFormReason('');
        setPendingChanges({});
        fetchOrders(client.id);
        fetchTechs();
    };

    const fetchOrders = async (clientId) => {
        setLoadingOrders(true);
        try {
            const res = await fetch(`/api/clients/${clientId}/orders`);
            const data = await res.json();
            setOrders(Array.isArray(data) ? data : []);
        } catch (e) { console.error(e); }
        finally { setLoadingOrders(false); }
    };

    const fetchTechs = async () => {
        if (techs.length > 0) return;
        try {
            const res = await fetch(`/api/clients/technicians/list`);
            const data = await res.json();
            setTechs(data);
        } catch (e) { console.error(e); }
    };

    // ✅ Bug 7: Track changes locally — NO API call on change
    const handleOrderFieldChange = (orderId, field, value) => {
        if (field === 'status' && value === 'COMPLETED') {
            const order = orders.find(o => o.id === orderId);
            const techId = (pendingChanges[orderId]?.assigned_tech_id) ?? order.assigned_tech_id;
            if (!techId) {
                setAlert({ show: true, type: 'error', title: 'Falta Técnico', message: 'Debe asignar un técnico antes de finalizar la orden.' });
                return;
            }
        }
        // Update local display for instant visual feedback
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, [field]: value } : o));
        // Track pending changes
        setPendingChanges(prev => ({
            ...prev,
            [orderId]: { ...(prev[orderId] || {}), [field]: value }
        }));
    };

    // ✅ Bug 7: Explicit save button handler
    const handleSaveOrder = async (orderId) => {
        const changes = pendingChanges[orderId];
        if (!changes) return;

        const order = orders.find(o => o.id === orderId);
        setSavingOrderId(orderId);
        try {
            const payload = {
                ...order,
                ...changes,
                notes: changes.technician_notes ?? order.technician_notes
            };
            await fetch(`/api/clients/orders/${orderId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            // Clear pending changes for this order
            setPendingChanges(prev => {
                const next = { ...prev };
                delete next[orderId];
                return next;
            });

            const finalStatus = changes.status ?? order.status;
            if (finalStatus === 'COMPLETED') {
                setAlert({ show: true, type: 'success', title: '✅ Orden Finalizada', message: '¡La orden ha sido completada y registrada exitosamente!' });
            } else {
                setAlert({ show: true, type: 'success', title: '💾 Cambios Guardados', message: 'Los cambios han sido guardados correctamente.' });
            }
        } catch (e) {
            console.error(e);
            setAlert({ show: true, type: 'error', title: 'Error', message: 'No se pudieron guardar los cambios. Intente de nuevo.' });
        } finally {
            setSavingOrderId(null);
        }
    };

    const handleSubmitMovement = async (e) => {
        e.preventDefault();
        if (!selectedAction || !selectedClient) return;

        setActionLoading(true);
        try {
            const payload = {
                client_id: selectedClient.id,
                type: selectedAction,
                new_value: formValue,
                reason: formReason,
                user_id: 1
            };

            const res = await fetch('/api/clients/movements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (res.ok) {
                setAlert({ show: true, type: 'success', title: 'Trámite Registrado', message: 'El movimiento ha sido guardado exitosamente.' });
                setSelectedClient(null);
                setSelectedAction('');
                setDebouncedSearch(prev => prev + ' ');
            } else {
                setAlert({ show: true, type: 'error', title: 'Error', message: data.msg || 'Error al guardar trámite.' });
            }
        } catch (err) {
            console.error(err);
            setAlert({ show: true, type: 'error', title: 'Error', message: 'Error de conexión.' });
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteOrder = async (orderId) => {
        if (!window.confirm("¿Está seguro de eliminar esta orden de servicio? Esta acción no se puede deshacer.")) return;
        try {
            const res = await fetch(`/api/clients/orders/${orderId}`, { method: 'DELETE' });
            if (res.ok) {
                setAlert({ show: true, type: 'success', title: 'Eliminado', message: 'Orden eliminada correctamente.' });
                if (selectedClient) {
                    fetchOrders(selectedClient.id);
                }
                if (viewMode === 'LIST' || viewMode === 'PENDING' || viewMode === 'COMPLETED') {
                    fetchDailyOrders();
                }
            } else {
                setAlert({ show: true, type: 'error', title: 'Error', message: 'No se pudo eliminar.' });
            }
        } catch (e) {
            console.error(e);
            setAlert({ show: true, type: 'error', title: 'Error', message: 'Error de conexión.' });
        }
    };

    // List View State
    const [viewMode, setViewMode] = useState('SEARCH');

    // Fetch Daily Orders
    const fetchDailyOrders = async () => {
        setLoadingDaily(true);
        try {
            let url = `/api/reports/orders?list=true`;
            if (viewMode === 'PENDING') url += '&status=PENDING';
            else if (viewMode === 'COMPLETED') url += '&status=COMPLETED';
            else url += '&status=ALL';
            if (startDate && endDate) url += `&startDate=${startDate}&endDate=${endDate}`;
            const res = await fetch(url);
            const data = await res.json();
            setDailyOrders(Array.isArray(data) ? data : []);
        } catch (e) { console.error(e); }
        finally { setLoadingDaily(false); }
    };

    useEffect(() => {
        if (viewMode === 'LIST' || viewMode === 'PENDING' || viewMode === 'COMPLETED') fetchDailyOrders();
    }, [viewMode, startDate, endDate]);

    const handleExportExcel = async () => {
        try {
            setAlert({ show: true, type: 'info', title: 'Generando Reporte', message: 'Por favor espere...' });
            const res = await fetch(`/api/reports/orders/export?startDate=${startDate}&endDate=${endDate}&status=${viewMode}`);
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Reporte_Tramites_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
            setAlert({ ...alert, show: false });
        } catch (e) {
            console.error(e);
            setAlert({ show: true, type: 'error', title: 'Error', message: 'Error al exportar a Excel.' });
        }
    };

    const handleTabChange = (mode) => {
        setViewMode(mode);
        if (mode === 'LIST') {
            const today = new Date().toISOString().split('T')[0];
            setStartDate(today);
            setEndDate(today);
        } else if (mode === 'PENDING' || mode === 'COMPLETED') {
            setStartDate('');
            setEndDate('');
        }
    };

    const handleCreateOrder = async (orderType) => {
        if (!selectedClient) return;
        if (!formReason.trim()) {
            setAlert({ show: true, title: 'Error', message: 'Debe ingresar un motivo o detalle.', type: 'error' });
            return;
        }
        setActionLoading(true);
        try {
            await fetch(`/api/clients/${selectedClient.id}/manual-order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: orderType, description: formReason })
            });
            setAlert({ show: true, title: 'Éxito', message: 'Orden creada correctamente. Aparecerá en la lista de Pendientes.', type: 'success' });
            setSelectedAction('');
            setFormReason('');
            fetchOrders(selectedClient.id);
        } catch (e) {
            setAlert({ show: true, title: 'Error', message: 'No se pudo crear la orden.', type: 'error' });
        } finally { setActionLoading(false); }
    };

    // Tab config for dynamic rendering
    const TABS = [
        { mode: 'SEARCH',    icon: '🔍', label: 'Nuevo Trámite',       color: '#3b82f6', shadow: 'rgba(59,130,246,0.35)'  },
        { mode: 'LIST',      icon: '📋', label: 'Todos (Hoy)',          color: '#8b5cf6', shadow: 'rgba(139,92,246,0.35)' },
        { mode: 'PENDING',   icon: '⏳', label: 'En Proceso',           color: '#f59e0b', shadow: 'rgba(245,158,11,0.35)' },
        { mode: 'COMPLETED', icon: '✅', label: 'Finalizados',          color: '#10b981', shadow: 'rgba(16,185,129,0.35)' },
    ];

    return (
        <div className="page-container" style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
            {(loading || loadingDaily || actionLoading) && <FullPageLoader />}

            {/* ===== HEADER ===== */}
            <div style={{ marginBottom: '2rem' }}>
                <div style={{
                    background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px',
                    padding: '1.5rem 2rem', marginBottom: '1.5rem',
                    boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)'
                }}>
                    <h1 style={{
                        fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', marginBottom: '0.25rem', color: 'white', fontWeight: 800,
                        background: 'linear-gradient(135deg, #f8fafc 0%, #94a3b8 100%)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
                    }}>
                        Gestión de Trámites
                    </h1>
                    <p style={{ color: '#64748b', margin: 0, fontSize: '0.95rem' }}>
                        Registro de cambios, traslados y órdenes de servicio para clientes
                    </p>
                </div>

                {/* ===== NAVIGATION TABS — Bug 8: Rediseño ===== */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {/* Alertas Button */}
                    <button
                        onClick={() => setShowNotifications(true)}
                        style={{
                            position: 'relative',
                            background: notificationCount > 0 ? 'linear-gradient(135deg, #e11d48, #be123c)' : 'rgba(225,29,72,0.12)',
                            border: '1px solid rgba(225,29,72,0.4)',
                            color: notificationCount > 0 ? 'white' : '#f87171',
                            padding: '0.65rem 1.2rem', borderRadius: '12px', cursor: 'pointer', fontWeight: 700,
                            display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s',
                            boxShadow: notificationCount > 0 ? '0 4px 15px rgba(225,29,72,0.35)' : 'none',
                            fontSize: '0.9rem'
                        }}
                    >
                        🚨 Alertas
                        {notificationCount > 0 && (
                            <span style={{
                                background: 'white', color: '#e11d48', borderRadius: '50%',
                                width: '22px', height: '22px', fontSize: '0.75rem',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800
                            }}>
                                {notificationCount}
                            </span>
                        )}
                    </button>

                    <div style={{ width: '1px', height: '32px', background: 'rgba(255,255,255,0.1)' }} />

                    {/* Nav Tabs */}
                    {TABS.map(tab => (
                        <button
                            key={tab.mode}
                            onClick={() => handleTabChange(tab.mode)}
                            style={{
                                padding: '0.65rem 1.3rem', borderRadius: '12px',
                                border: viewMode === tab.mode ? 'none' : '1px solid rgba(255,255,255,0.08)',
                                background: viewMode === tab.mode ? tab.color : 'rgba(255,255,255,0.04)',
                                color: viewMode === tab.mode ? 'white' : '#94a3b8',
                                cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem',
                                display: 'flex', alignItems: 'center', gap: '0.4rem',
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                boxShadow: viewMode === tab.mode ? `0 4px 15px ${tab.shadow}` : 'none',
                                transform: viewMode === tab.mode ? 'translateY(-1px)' : 'none'
                            }}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}

                    <button
                        onClick={() => setShowHistory(true)}
                        style={{
                            padding: '0.65rem 1rem', borderRadius: '12px',
                            border: '1px solid rgba(255,255,255,0.08)',
                            background: 'rgba(255,255,255,0.04)',
                            color: '#94a3b8', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                            marginLeft: 'auto'
                        }}
                    >
                        🕒 Historial
                    </button>
                </div>
            </div>

            {/* ===== UNIFIED LIST VIEW ===== */}
            {(viewMode === 'LIST' || viewMode === 'PENDING' || viewMode === 'COMPLETED') && (
                <div>
                    {/* Filters Row */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
                        background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px',
                        padding: '1rem 1.5rem', marginBottom: '1.5rem'
                    }}>
                        <h3 style={{ color: 'white', margin: 0, fontWeight: 700, flexGrow: 1, fontSize: '1.05rem' }}>
                            {viewMode === 'LIST' && '📋 Trámites del Día'}
                            {viewMode === 'PENDING' && '⏳ En Proceso / Pendientes'}
                            {viewMode === 'COMPLETED' && '✅ Trámites Finalizados'}
                        </h3>
                        <label style={{ color: '#64748b', fontSize: '0.85rem' }}>Desde:</label>
                        <input type="date" className="input-dark" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ padding: '0.4rem', fontSize: '0.9rem' }} />
                        <label style={{ color: '#64748b', fontSize: '0.85rem' }}>Hasta:</label>
                        <input type="date" className="input-dark" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ padding: '0.4rem', fontSize: '0.9rem' }} />
                        {(startDate || endDate) && (
                            <button onClick={() => { setStartDate(''); setEndDate(''); }} style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', borderRadius: '8px', cursor: 'pointer' }}>
                                ✕ Limpiar
                            </button>
                        )}
                        <button onClick={handleExportExcel} style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399', borderRadius: '8px', cursor: 'pointer', display: 'flex', gap: '5px', alignItems: 'center' }}>
                            📥 Excel
                        </button>
                        <button onClick={fetchDailyOrders} style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', color: '#60a5fa', borderRadius: '8px', cursor: 'pointer' }}>
                            🔄 Actualizar
                        </button>
                    </div>

                    <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', color: '#cbd5e1', minWidth: '700px' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(30,41,59,0.5)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                        {['#', 'Fecha', 'Tipo', 'Cliente', 'Estado', 'Detalle', 'Acción'].map(h => (
                                            <th key={h} style={{ padding: '1rem 1.2rem', textAlign: 'left', color: '#64748b', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {loadingDaily && <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>Cargando trámites...</td></tr>}
                                    {!loadingDaily && dailyOrders.length === 0 && (
                                        <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                                            No hay registros para este período.
                                        </td></tr>
                                    )}
                                    {!loadingDaily && dailyOrders.map((order, idx) => (
                                        <tr key={order.id}
                                            style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <td style={{ padding: '1rem 1.2rem', fontSize: '0.85rem', color: '#475569' }}>{order.id}</td>
                                            <td style={{ padding: '1rem 1.2rem', fontSize: '0.88rem' }}>{new Date(order.created_at).toLocaleDateString('es-NI')}</td>
                                            <td style={{ padding: '1rem 1.2rem', fontWeight: 700, color: 'white', fontSize: '0.9rem' }}>{order.type || order.action}</td>
                                            <td style={{ padding: '1rem 1.2rem' }}>
                                                <div style={{ fontWeight: 600, color: 'white', fontSize: '0.9rem' }}>{order.client_name || 'N/A'}</div>
                                                {order.contract_number && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{order.contract_number}</div>}
                                            </td>
                                            <td style={{ padding: '1rem 1.2rem' }}>
                                                <StatusBadge status={order.status} />
                                            </td>
                                            <td style={{ padding: '1rem 1.2rem', fontSize: '0.85rem', color: '#94a3b8', maxWidth: '220px' }}>
                                                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {order.description || order.details || order.technician_notes || '—'}
                                                </div>
                                            </td>
                                            <td style={{ padding: '1rem 1.2rem' }}>
                                                {order.client_id ? (
                                                    <button
                                                        onClick={() => {
                                                            handleSelectClient({
                                                                id: order.client_id,
                                                                full_name: order.client_name,
                                                                status: order.client_status || 'active',
                                                                address_street: order.address_street || '',
                                                                contract_number: order.contract_number || ''
                                                            });
                                                            setViewMode('SEARCH');
                                                        }}
                                                        style={{
                                                            background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.35)',
                                                            color: '#60a5fa', padding: '0.4rem 0.8rem', borderRadius: '8px',
                                                            cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
                                                            display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap'
                                                        }}
                                                        title="Gestionar Cliente"
                                                    >
                                                        ➡️ Gestionar
                                                    </button>
                                                ) : <span style={{ color: '#334155' }}>N/A</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== SEARCH CLIENT VIEW ===== */}
            {viewMode === 'SEARCH' && !selectedClient && (
                <div>
                    <div style={{
                        background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem'
                    }}>
                        <h3 style={{ color: 'white', marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 700 }}>
                            👤 Seleccionar Cliente para Trámite
                        </h3>
                        <input
                            type="text"
                            placeholder="🔍  Buscar por Nombre, Cédula o Contrato..."
                            className="input-dark"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{ flex: 1, width: '100%', fontSize: '1.1rem', padding: '1rem 1.2rem' }}
                        />
                    </div>

                    {/* Alphabet */}
                    <div style={{ display: 'flex', gap: '0.25rem', overflowX: 'auto', paddingBottom: '1rem', marginBottom: '1.5rem', scrollbarWidth: 'thin' }}>
                        <button onClick={() => setLetterFilter('')} style={{ padding: '0.45rem 1rem', borderRadius: '8px', background: letterFilter === '' ? '#3b82f6' : 'rgba(255,255,255,0.05)', color: letterFilter === '' ? 'white' : '#64748b', cursor: 'pointer', border: 'none', fontWeight: 700, transition: 'all 0.15s', whiteSpace: 'nowrap' }}>TODOS</button>
                        {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(char => (
                            <button key={char} onClick={() => setLetterFilter(char)} style={{ minWidth: '36px', padding: '0.45rem', borderRadius: '8px', background: letterFilter === char ? '#3b82f6' : 'rgba(255,255,255,0.05)', color: letterFilter === char ? 'white' : '#64748b', cursor: 'pointer', border: 'none', fontWeight: 700, transition: 'all 0.15s' }}>{char}</button>
                        ))}
                    </div>

                    {/* Client Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
                        {loading && <div style={{ color: '#94a3b8', gridColumn: '1/-1', textAlign: 'center', padding: '3rem' }}>Buscando clientes...</div>}
                        {!loading && clients.length === 0 && <div style={{ color: '#64748b', gridColumn: '1/-1', textAlign: 'center', padding: '3rem' }}>No se encontraron resultados.</div>}
                        {!loading && clients.map((c, i) => {
                            const statusColor = c.status === 'active' ? '#22c55e' : c.status === 'suspended' ? '#f59e0b' : '#f87171';
                            const statusLabel = { active: 'Activo', suspended: 'Cortado', disconnected: 'Retirado', pending_install: 'Pendiente', disconnected_by_request: 'Desc. Solicitud' }[c.status] || c.status;
                            return (
                                <div key={c.id} className="glass-card" style={{
                                    animationDelay: `${i * 0.04}s`,
                                    borderLeft: `3px solid ${statusColor}`,
                                    transition: 'all 0.2s', cursor: 'pointer'
                                }}
                                    onClick={() => handleSelectClient(c)}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
                                        <h4 style={{ margin: 0, color: 'white', fontWeight: 700, fontSize: '1rem', lineHeight: 1.3 }}>{c.full_name}</h4>
                                        <span style={{ color: statusColor, fontSize: '0.75rem', fontWeight: 700, background: `${statusColor}20`, padding: '0.15rem 0.5rem', borderRadius: '20px', whiteSpace: 'nowrap', marginLeft: '0.5rem' }}>
                                            {statusLabel}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                        <div>📍 {c.address_street || 'Sin dirección'}</div>
                                        <div>📄 Contrato: <span style={{ color: '#cbd5e1', fontWeight: 600 }}>{c.contract_number}</span></div>
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleSelectClient(c); }}
                                        style={{
                                            width: '100%', padding: '0.7rem', borderRadius: '10px',
                                            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                            border: 'none', color: 'white', fontWeight: 700, cursor: 'pointer',
                                            fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                            boxShadow: '0 4px 12px rgba(59,130,246,0.3)', transition: 'all 0.2s'
                                        }}
                                    >
                                        📝 Gestionar Trámite
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ===== MANAGE CLIENT VIEW ===== */}
            {selectedClient && viewMode === 'SEARCH' && (
                <div>
                    {/* Back button */}
                    <button onClick={() => setSelectedClient(null)} style={{
                        background: 'none', border: 'none', color: '#64748b', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem',
                        fontSize: '0.95rem', fontWeight: 600, transition: 'color 0.2s'
                    }}
                        onMouseEnter={e => e.currentTarget.style.color = '#94a3b8'}
                        onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
                    >
                        ⬅ Volver a búsqueda
                    </button>

                    {/* Client Info Card */}
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(30,41,59,0.8), rgba(15,23,42,0.9))',
                        border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px',
                        padding: '1.5rem 2rem', marginBottom: '1.5rem', maxWidth: '800px', margin: '0 auto 1.5rem auto',
                        boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                            <div>
                                <h2 style={{ color: 'white', margin: '0 0 0.4rem 0', fontWeight: 800, fontSize: '1.4rem' }}>
                                    {selectedClient.full_name}
                                </h2>
                                <p style={{ color: '#64748b', margin: 0, fontSize: '0.9rem' }}>{selectedClient.address_street}</p>
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                <StatusBadge status={selectedClient.status} />
                                <span style={{ color: '#475569', fontSize: '0.85rem' }}>#{selectedClient.contract_number}</span>
                            </div>
                        </div>
                    </div>

                    {/* ===== ACTION TILES — Bug 8: Visual & Descriptive ===== */}
                    {!selectedAction ? (
                        <div style={{ maxWidth: '800px', margin: '0 auto 2rem auto' }}>
                            <h3 style={{ color: '#94a3b8', marginBottom: '1rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
                                ¿Qué trámite desea realizar?
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
                                {ACTION_TILES.map(tile => (
                                    <button
                                        key={tile.action}
                                        onClick={() => setSelectedAction(tile.action)}
                                        style={{
                                            padding: '1.5rem 1rem', textAlign: 'center',
                                            display: 'flex', flexDirection: 'column', gap: '0.6rem', alignItems: 'center',
                                            background: tile.bg, border: `1px solid ${tile.border}`,
                                            borderRadius: '16px', cursor: 'pointer', color: 'white',
                                            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                                        }}
                                        onMouseEnter={e => {
                                            e.currentTarget.style.transform = 'translateY(-4px)';
                                            e.currentTarget.style.boxShadow = `0 12px 30px ${tile.border}`;
                                            e.currentTarget.style.borderColor = tile.color;
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = 'none';
                                            e.currentTarget.style.borderColor = tile.border;
                                        }}
                                    >
                                        <span style={{ fontSize: '2.5rem', lineHeight: 1 }}>{tile.icon}</span>
                                        <span style={{ fontWeight: 800, color: tile.color, fontSize: '0.95rem' }}>{tile.label}</span>
                                        <span style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.4 }}>{tile.desc}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div style={{ maxWidth: '800px', margin: '0 auto 2rem auto' }}>
                            <div style={{
                                background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '20px', padding: '2rem'
                            }}>
                                <button type="button" onClick={() => setSelectedAction('')} style={{
                                    background: 'none', border: 'none', color: '#64748b', cursor: 'pointer',
                                    marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
                                    fontWeight: 600, fontSize: '0.9rem'
                                }}>
                                    ⬅ Cambiar acción
                                </button>

                                <h3 style={{ borderLeft: '4px solid #3b82f6', paddingLeft: '1rem', color: 'white', marginBottom: '1.5rem', fontWeight: 800 }}>
                                    {ACTION_TILES.find(t => t.action === selectedAction)?.icon} {ACTION_TILES.find(t => t.action === selectedAction)?.label}
                                </h3>

                                <form onSubmit={handleSubmitMovement}>
                                    <div style={{ display: 'grid', gap: '1.5rem' }}>
                                        {selectedAction === 'CHANGE_NAME' && (
                                            <div>
                                                <label className="label-dark">Nuevo Nombre Completo (Razón Social)</label>
                                                <input className="input-dark" value={formValue} onChange={e => setFormValue(e.target.value)} required placeholder={`Actual: ${selectedClient.full_name}`} />
                                            </div>
                                        )}
                                        {selectedAction === 'CHANGE_ADDRESS' && (
                                            <div>
                                                <label className="label-dark">Nueva Dirección Exacta</label>
                                                <textarea className="input-dark" value={formValue} onChange={e => setFormValue(e.target.value)} required placeholder={`Actual: ${selectedClient.address_street}`} rows={3} />
                                            </div>
                                        )}
                                        <div>
                                            <label className="label-dark">
                                                {selectedAction === 'REPAIR' ? '🔧 Descripción de la Avería (obligatorio)' :
                                                    selectedAction === 'INSTALLATION' ? '📡 Detalles de la Instalación (obligatorio)' :
                                                        '📝 Motivo / Observaciones (obligatorio)'}
                                            </label>
                                            <textarea
                                                className="input-dark"
                                                value={formReason}
                                                onChange={e => setFormReason(e.target.value)}
                                                required rows={4}
                                                placeholder={
                                                    selectedAction === 'REPAIR' ? 'Describa el problema reportado con precisión...' :
                                                        selectedAction === 'INSTALLATION' ? 'Detalles de la instalación, materiales, zona...' :
                                                            'Explique brevemente el motivo del trámite...'
                                                }
                                                style={{ resize: 'vertical' }}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                            <button type="button" onClick={() => setSelectedAction('')} style={{
                                                padding: '0.8rem 1.5rem', borderRadius: '10px', background: 'transparent',
                                                border: '1px solid #334155', color: '#94a3b8', cursor: 'pointer', fontWeight: 600
                                            }}>Cancelar</button>
                                            {selectedAction === 'REPAIR' || selectedAction === 'INSTALLATION' ? (
                                                <button type="button" onClick={() => handleCreateOrder(selectedAction)} disabled={actionLoading} style={{
                                                    padding: '0.8rem 2rem', borderRadius: '10px',
                                                    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                                    border: 'none', color: 'white', fontWeight: 700, cursor: 'pointer', minWidth: '160px',
                                                    boxShadow: '0 4px 15px rgba(59,130,246,0.35)'
                                                }}>
                                                    {actionLoading ? 'Creando...' : '📋 Crear Orden'}
                                                </button>
                                            ) : (
                                                <button type="submit" disabled={actionLoading} style={{
                                                    padding: '0.8rem 2rem', borderRadius: '10px',
                                                    background: 'linear-gradient(135deg, #10b981, #059669)',
                                                    border: 'none', color: 'white', fontWeight: 700, cursor: 'pointer', minWidth: '160px',
                                                    boxShadow: '0 4px 15px rgba(16,185,129,0.35)'
                                                }}>
                                                    {actionLoading ? 'Guardando...' : '✅ Confirmar Trámite'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* ===== SERVICE ORDERS — Bug 7: Manual Save Button ===== */}
                    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.75rem' }}>
                            <h3 style={{ color: 'white', margin: 0, fontWeight: 800 }}>🛠️ Órdenes de Servicio</h3>
                            {Object.keys(pendingChanges).length > 0 && (
                                <span style={{ fontSize: '0.8rem', color: '#f59e0b', background: 'rgba(245,158,11,0.15)', padding: '0.25rem 0.75rem', borderRadius: '20px', border: '1px solid rgba(245,158,11,0.3)' }}>
                                    ⚠️ {Object.keys(pendingChanges).length} orden{Object.keys(pendingChanges).length > 1 ? 'es' : ''} con cambios sin guardar
                                </span>
                            )}
                        </div>

                        {loadingOrders && <div style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>Cargando órdenes...</div>}
                        {!loadingOrders && orders.length === 0 && (
                            <div style={{ padding: '2rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', color: '#64748b', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.07)' }}>
                                No hay órdenes de servicio recientes para este cliente.
                            </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            {orders.map(order => {
                                const hasPending = !!pendingChanges[order.id];
                                const borderColor = order.status === 'COMPLETED' ? '#10b981' : order.status === 'IN_PROGRESS' ? '#3b82f6' : '#f59e0b';
                                return (
                                    <div key={order.id} style={{
                                        background: 'rgba(15,23,42,0.7)', border: `1px solid ${hasPending ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.07)'}`,
                                        borderLeft: `4px solid ${hasPending ? '#f59e0b' : borderColor}`,
                                        borderRadius: '16px', padding: '1.5rem',
                                        transition: 'all 0.2s',
                                        boxShadow: hasPending ? '0 0 0 1px rgba(245,158,11,0.15)' : 'none'
                                    }}>
                                        {/* Order Header */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <span style={{ fontWeight: 800, color: 'white', fontSize: '1rem' }}>{order.type}</span>
                                                <StatusBadge status={order.status} />
                                                {hasPending && (
                                                    <span style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 700, background: 'rgba(245,158,11,0.1)', padding: '0.15rem 0.5rem', borderRadius: '20px' }}>
                                                        Sin guardar
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <span style={{ fontSize: '0.8rem', color: '#475569' }}>{new Date(order.created_at).toLocaleDateString('es-NI')}</span>
                                                <button 
                                                    onClick={() => handleDeleteOrder(order.id)}
                                                    title="Eliminar orden"
                                                    style={{ 
                                                        background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.4)',
                                                        color: '#f87171', borderRadius: '8px', cursor: 'pointer',
                                                        padding: '0.3rem 0.6rem', fontSize: '0.75rem', fontWeight: 600, transition: 'all 0.2s'
                                                    }}
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </div>

                                        {/* Description */}
                                        {order.description && (
                                            <div style={{ marginBottom: '1rem', color: '#94a3b8', fontSize: '0.88rem', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '8px' }}>
                                                <span style={{ color: '#64748b', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Solicitud: </span>
                                                {order.description}
                                            </div>
                                        )}

                                        {/* Materials preview */}
                                        {order.materials_summary && order.materials_summary.length > 0 && (
                                            <div style={{ marginBottom: '1rem', background: 'rgba(0,0,0,0.25)', padding: '0.8rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                                                <p style={{ margin: '0 0 0.5rem 0', color: '#64748b', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Materiales Registrados</p>
                                                <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#cbd5e1', fontSize: '0.85rem' }}>
                                                    {order.materials_summary.map((m, idx) => (
                                                        <li key={idx}>{m.product_name} <span style={{ color: '#64748b' }}>({parseFloat(m.quantity)} {m.unit || 'Un.'})</span></li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {/* Materials Button */}
                                        <button
                                            onClick={() => { setSelectedOrderForMaterials(order); setShowMaterialsModal(true); }}
                                            style={{
                                                width: '100%', marginBottom: '1rem', padding: '0.65rem',
                                                background: 'rgba(139,92,246,0.08)', border: '1px dashed rgba(139,92,246,0.3)',
                                                color: '#a78bfa', borderRadius: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '0.87rem',
                                                display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s'
                                            }}
                                        >
                                            📦 {order.materials_summary && order.materials_summary.length > 0 ? 'Editar Materiales' : 'Gestionar Materiales'}
                                        </button>

                                        {/* Technician Notes */}
                                        <div style={{ marginBottom: '1rem' }}>
                                            <label style={{ display: 'block', color: '#64748b', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                Notas del Técnico
                                            </label>
                                            <textarea
                                                className="input-dark"
                                                rows={2}
                                                placeholder="Detalles sobre la visita, materiales usados, estado final..."
                                                value={order.technician_notes || ''}
                                                onChange={(e) => handleOrderFieldChange(order.id, 'technician_notes', e.target.value)}
                                                style={{ width: '100%', fontSize: '0.9rem', borderColor: hasPending ? 'rgba(245,158,11,0.3)' : '' }}
                                            />
                                        </div>

                                        {/* Status & Tech Grid */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                            <div>
                                                <label style={{ display: 'block', color: '#64748b', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Estado</label>
                                                <select
                                                    className="input-dark"
                                                    style={{ padding: '0.6rem', width: '100%', fontWeight: 600 }}
                                                    value={order.status}
                                                    onChange={(e) => handleOrderFieldChange(order.id, 'status', e.target.value)}
                                                >
                                                    <option value="PENDING">⏳ Pendiente</option>
                                                    <option value="IN_PROGRESS">🔵 En Proceso</option>
                                                    <option value="COMPLETED">✅ Finalizada</option>
                                                    <option value="CANCELLED">❌ Cancelada</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', color: '#64748b', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Técnico Asignado</label>
                                                <select
                                                    className="input-dark"
                                                    style={{ padding: '0.6rem', width: '100%' }}
                                                    value={order.assigned_tech_id || ''}
                                                    onChange={(e) => handleOrderFieldChange(order.id, 'assigned_tech_id', e.target.value)}
                                                >
                                                    <option value="">-- Sin Asignar --</option>
                                                    {techs.map(t => (
                                                        <option key={t.id} value={t.id}>{t.full_name || t.username}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        {/* ✅ Bug 7: SAVE BUTTON — Explicit, only shows when there are pending changes */}
                                        {hasPending && (
                                            <button
                                                onClick={() => handleSaveOrder(order.id)}
                                                disabled={savingOrderId === order.id}
                                                style={{
                                                    width: '100%', padding: '0.85rem',
                                                    background: savingOrderId === order.id
                                                        ? 'rgba(245,158,11,0.3)'
                                                        : 'linear-gradient(135deg, #f59e0b, #d97706)',
                                                    border: 'none', borderRadius: '12px',
                                                    color: 'white', fontWeight: 800, cursor: 'pointer', fontSize: '1rem',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                                    boxShadow: '0 4px 20px rgba(245,158,11,0.4)',
                                                    transition: 'all 0.2s',
                                                    animation: 'pulse 2s infinite'
                                                }}
                                            >
                                                {savingOrderId === order.id ? '⏳ Guardando...' : '💾 Guardar Cambios'}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* ===== MODALS ===== */}
            {showHistory && selectedClient && (
                <HistoryModal client={selectedClient} initialTab="logs" onClose={() => setShowHistory(false)} />
            )}
            {showNotifications && (
                <WebNotificationsModal
                    onClose={() => setShowNotifications(false)}
                    onAssignClient={(averia) => {
                        setShowNotifications(false);
                        setSearch(averia.nombre_completo);
                        setViewMode('SEARCH');
                        setAlert({ show: true, type: 'info', title: 'Buscando Cliente', message: `Buscando: ${averia.nombre_completo}` });
                    }}
                />
            )}
            {showMaterialsModal && selectedOrderForMaterials && (
                <MaterialsModal
                    order={selectedOrderForMaterials}
                    onClose={() => { setShowMaterialsModal(false); setSelectedOrderForMaterials(null); }}
                />
            )}

            <CustomAlert
                isOpen={alert.show}
                title={alert.title}
                message={alert.message}
                type={alert.type}
                onClose={() => setAlert({ ...alert, show: false })}
            />
        </div>
    );
};

export default ClientMovements;
