import React, { useState, useEffect } from 'react';
// @ts-ignore
import CashRegister from '../components/CashRegister';
// @ts-ignore
import BillingModal from '../components/BillingModal';
// @ts-ignore
import CustomAlert from '../components/CustomAlert';
import ReceiptSettingsModal from '../components/ReceiptSettingsModal';
import eventBus from '../utils/eventBus';

const Billing = () => {
    // Data State
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filter State
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [letterFilter, setLetterFilter] = useState('');

    // UI State
    const [selectedClient, setSelectedClient] = useState(null);
    const [showBilling, setShowBilling] = useState(false);
    const [alert, setAlert] = useState({ show: false, title: '', message: '', type: 'info' });
    const [showTicketConfig, setShowTicketConfig] = useState(false);

    // Refresh Logic
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const limit = 12; // User requested 12

    const [isSessionOpen, setIsSessionOpen] = useState(false);
    const [activeSessionType, setActiveSessionType] = useState('OFICINA');
    // View Mode: 'SEARCH' | 'HISTORY' | 'MOVEMENT_IN' | 'MOVEMENT_OUT'
    const [viewMode, setViewMode] = useState('SEARCH');

    // Debounce Search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1); // Reset to page 1 on search
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    // Global Event Source Config for Realtime Updating
    useEffect(() => {
        const unsubscribe = eventBus.subscribe('GLOBAL_REFRESH', () => {
            setRefreshTrigger(prev => prev + 1);
        });
        return () => unsubscribe();
    }, []);

    // Fetch Clients (Backend Filtered) - Only if Session Open and Search Mode
    useEffect(() => {
        if (!isSessionOpen || viewMode !== 'SEARCH') return;

        const fetchClients = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams({
                    page: page,
                    limit: limit,
                    search: debouncedSearch,
                    start_letter: letterFilter,
                    status: 'all'
                });

                const res = await fetch(`/api/clients?${params.toString()}`, { cache: 'no-store' });
                const data = await res.json();

                if (data.clients) {
                    setClients(data.clients);
                    setTotalPages(data.totalPages || 1);
                } else {
                    setClients([]);
                }
            } catch (err) {
                console.error(err);
                setClients([]);
            } finally {
                setLoading(false);
            }
        };

        fetchClients();
    }, [debouncedSearch, letterFilter, isSessionOpen, viewMode, refreshTrigger]);

    // State for Visit Modal
    const [visitModal, setVisitModal] = useState({ show: false, client: null, reason: '' });

    const openVisitModal = (client) => {
        setVisitModal({ show: true, client, reason: '' });
    };

    const confirmVisit = async () => {
        if (!visitModal.reason) return;
        const client = visitModal.client;

        try {
            const res = await fetch(`/api/clients/${client.id}/manual-order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'REPAIR', description: visitModal.reason })
            });
            const data = await res.json();
            if (res.ok) {
                setAlert({ show: true, type: 'success', title: 'Visita Solicitada', message: 'Orden de servicio creada exitosamente.' });
                setVisitModal({ show: false, client: null, reason: '' });
            } else {
                setAlert({ show: true, type: 'error', title: 'Error', message: data.msg || 'Error al crear orden.' });
            }
        } catch (err) {
            console.error(err);
            setAlert({ show: true, type: 'error', title: 'Error', message: 'Fallo de conexión.' });
        }
    };

    return (
        <div className="page-container" style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>

            <div className="animate-entry" style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '3rem', 
                background: 'linear-gradient(90deg, rgba(30, 41, 59, 0.4) 0%, transparent 100%)',
                padding: '1.5rem 2rem',
                borderRadius: '24px',
                border: '1px solid rgba(255,255,255,0.05)',
                backdropFilter: 'blur(10px)'
            }}>
                <div>
                    <h1 style={{ 
                        fontSize: '2.5rem', 
                        color: 'white', 
                        margin: 0, 
                        fontWeight: '900',
                        letterSpacing: '-1px',
                        background: 'linear-gradient(135deg, #fff 0%, #94a3b8 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}>Facturación y Caja</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                        <span style={{ color: '#3b82f6', fontWeight: '800' }}>●</span>
                        <p style={{ color: '#94a3b8', margin: 0, fontSize: '1rem', fontWeight: '500' }}>Centro de Operaciones y Control de Turnos</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowTicketConfig(true)}
                    className="btn-secondary"
                    style={{ 
                        padding: '0.75rem 1.5rem', 
                        borderRadius: '14px', 
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}
                >
                    <span style={{ fontSize: '1.2rem' }}>⚙️</span> 
                    IMPRESORA
                </button>
            </div>

            {/* 1. THE CASH REGISTER DASHBOARD */}
            <div style={{ marginBottom: '2rem' }}>
                <CashRegister
                    onSessionChange={(isOpen) => setIsSessionOpen(isOpen)}
                    onTypeChange={(type) => setActiveSessionType(type)}
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                />
            </div>

            {/* 2. SEARCH CLIENT TO BILL */}
            {isSessionOpen && viewMode === 'SEARCH' && (
                <div className="animate-fade-in">
                    <div style={{ 
                        background: 'rgba(30, 41, 59, 0.6)', 
                        padding: '2rem', 
                        borderRadius: '28px', 
                        border: '1px solid rgba(255,255,255,0.05)', 
                        marginBottom: '2.5rem',
                        backdropFilter: 'blur(20px)',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
                    }}>
                        <div style={{ position: 'relative', marginBottom: '2rem' }}>
                            <input
                                type="text"
                                placeholder="Buscar por Nombre, Cédula o Contrato..."
                                className="input-dark"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                style={{ 
                                    width: '100%', 
                                    fontSize: '1.25rem', 
                                    padding: '1.25rem 1.5rem 1.25rem 3.5rem',
                                    borderRadius: '18px',
                                    background: 'rgba(15, 23, 42, 0.8)',
                                    border: '1px solid rgba(59, 130, 246, 0.3)',
                                    boxShadow: '0 0 0 0 rgba(59, 130, 246, 0)'
                                }}
                            />
                            <span style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1.5rem', opacity: 0.5 }}>🔍</span>
                        </div>

                        {/* Alphabet Filter Premium */}
                        <div style={{ display: 'flex', gap: '0.6rem', overflowX: 'auto', paddingBottom: '0.8rem' }} className="scrollbar-hide">
                            <button
                                onClick={() => setLetterFilter('')}
                                className={`btn-letter ${letterFilter === '' ? 'active' : ''}`}
                                style={{
                                    padding: '0.6rem 1.25rem',
                                    borderRadius: '12px',
                                    background: letterFilter === '' ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' : 'rgba(255,255,255,0.03)',
                                    color: letterFilter === '' ? 'white' : '#64748b',
                                    border: letterFilter === '' ? 'none' : '1px solid rgba(255,255,255,0.05)',
                                    cursor: 'pointer',
                                    fontWeight: '900',
                                    fontSize: '0.9rem',
                                    whiteSpace: 'nowrap',
                                    transition: 'all 0.3s ease',
                                    boxShadow: letterFilter === '' ? '0 10px 20px rgba(59, 130, 246, 0.3)' : 'none'
                                }}
                            >
                                TODOS
                            </button>
                            {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(char => (
                                <button
                                    key={char}
                                    onClick={() => setLetterFilter(char)}
                                    className={`btn-letter ${letterFilter === char ? 'active' : ''}`}
                                    style={{
                                        minWidth: '42px',
                                        height: '42px',
                                        padding: '0',
                                        borderRadius: '12px',
                                        background: letterFilter === char ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' : 'rgba(255,255,255,0.03)',
                                        color: letterFilter === char ? 'white' : '#64748b',
                                        border: letterFilter === char ? 'none' : '1px solid rgba(255,255,255,0.05)',
                                        cursor: 'pointer',
                                        fontWeight: '900',
                                        fontSize: '0.9rem',
                                        transition: 'all 0.2s ease',
                                        boxShadow: letterFilter === char ? '0 10px 20px rgba(59, 130, 246, 0.3)' : 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    {char}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* RESULTS GRID */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                        {loading && <div style={{ color: 'white', gridColumn: '1/-1', textAlign: 'center', padding: '2rem' }}>Cargando clientes...</div>}

                        {!loading && clients.length === 0 && (
                            <div style={{ color: '#64748b', gridColumn: '1/-1', textAlign: 'center', padding: '3rem', border: '2px dashed #334155', borderRadius: '12px' }}>
                                No se encontraron clientes con estos criterios.
                            </div>
                        )}

                        {!loading && clients.map((c) => (
                            <div key={c.id} className="client-billing-card" style={{
                                background: 'rgba(30, 41, 59, 0.4)',
                                border: '1px solid rgba(255,255,255,0.05)',
                                borderRadius: '24px',
                                padding: '2rem',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                position: 'relative',
                                overflow: 'hidden'
                            }}>
                                {/* Estatus Decorativo */}
                                <div style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '6px',
                                    height: '100%',
                                    background: c.status === 'active' ? '#10b981' : '#ef4444'
                                }}></div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.5rem' }}>
                                    <div>
                                        <h3 style={{ margin: 0, color: 'white', fontSize: '1.25rem', fontWeight: '800', letterSpacing: '-0.5px' }}>{c.full_name}</h3>
                                        <div style={{ color: '#3b82f6', fontSize: '0.85rem', fontWeight: 'bold', marginTop: '0.2rem' }}>CONTRATO: {c.contract_number}</div>
                                    </div>
                                    <span style={{
                                        fontSize: '0.7rem',
                                        fontWeight: '900',
                                        padding: '0.4rem 0.75rem',
                                        borderRadius: '10px',
                                        background: c.status === 'active' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                        color: c.status === 'active' ? '#10b981' : '#ef4444',
                                        border: `1px solid ${c.status === 'active' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                                    }}>
                                        {c.status === 'active' ? 'AL DÍA' : 'MOROSO'}
                                    </span>
                                </div>

                                <div style={{ fontSize: '0.95rem', color: '#94a3b8', marginBottom: '2rem', display: 'grid', gap: '0.75rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: '#64748b' }}>📍 Zona:</span> <span style={{ color: '#cbd5e1', fontWeight: 'bold' }}>{c.zone_name || 'Sin Zona'}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: '#64748b' }}>📅 Último Pago:</span> <span style={{ color: '#cbd5e1', fontWeight: 'bold' }}>{c.last_paid_month ? new Date(c.last_paid_month).toLocaleDateString('es-NI', { timeZone: 'America/Managua' }) : 'NUNCA'}</span>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <button
                                        onClick={() => { setSelectedClient(c); setShowBilling(true); }}
                                        className="btn-primary-glow"
                                        style={{ justifyContent: 'center', padding: '1rem', fontSize: '1rem', borderRadius: '14px', fontWeight: '800' }}
                                    >
                                        COBRAR
                                    </button>
                                    <button
                                        onClick={() => openVisitModal(c)}
                                        className="btn-secondary"
                                        style={{ 
                                            justifyContent: 'center', 
                                            padding: '1rem', 
                                            fontSize: '1rem', 
                                            borderRadius: '14px', 
                                            fontWeight: '800',
                                            background: 'rgba(255,255,255,0.03)',
                                            border: '1px solid rgba(255,255,255,0.1)'
                                        }}
                                    >
                                        TRAMITE
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* PAGINATION */}
                    {!loading && totalPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '3rem' }}>
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary">⬅ Anterior</button>
                            <span style={{ color: '#94a3b8', alignSelf: 'center' }}>Página <strong style={{ color: 'white' }}>{page}</strong> de {totalPages}</span>
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary">Siguiente ➡</button>
                        </div>
                    )}
                </div>
            )}

            {/* MODALS */}
            {showBilling && (
                <BillingModal
                    client={selectedClient}
                    defaultTargetBox={activeSessionType}
                    onClose={() => setShowBilling(false)}
                    onPaymentSuccess={() => {
                        setShowBilling(false);
                        setRefreshTrigger(p => p + 1);
                        setAlert({ show: true, type: 'success', title: 'Pago Exitoso', message: 'Cobro registrado.' });
                    }}
                />
            )}

            {/* Custom Visit Modal */}
            {visitModal.show && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="glass-card" style={{ width: '400px', padding: '2rem', background: '#1e293b' }}>
                        <h3 style={{ color: 'white', marginTop: 0 }}>Solicitar Visita Técnica</h3>
                        <p style={{ color: '#94a3b8' }}>Cliente: {visitModal.client?.full_name}</p>
                        <textarea
                            className="input-dark"
                            rows="4"
                            placeholder="Describa el motivo (Ej: Sin señal, Cable dañado...)"
                            value={visitModal.reason}
                            onChange={e => setVisitModal(prev => ({ ...prev, reason: e.target.value }))}
                            autoFocus
                        />
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                            <button onClick={() => setVisitModal({ show: false, client: null, reason: '' })} className="btn-secondary">Cancelar</button>
                            <button onClick={confirmVisit} className="btn-primary-glow">Confirmar</button>
                        </div>
                    </div>
                </div>
            )}

            <CustomAlert
                isOpen={alert.show}
                title={alert.title}
                message={alert.message}
                type={alert.type}
                onClose={() => setAlert({ ...alert, show: false })}
            />

            {showTicketConfig && <ReceiptSettingsModal onClose={() => setShowTicketConfig(false)} />}
        </div>
    );
};

export default Billing;

