import React, { useState, useEffect } from 'react';
// @ts-ignore
import CashRegister from '../components/CashRegister';
// @ts-ignore
import BillingModal from '../components/BillingModal';
// @ts-ignore
import CustomAlert from '../components/CustomAlert';
import ReceiptSettingsModal from '../components/ReceiptSettingsModal';

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
    const limit = 30; // User requested 30

    const [isSessionOpen, setIsSessionOpen] = useState(false);
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

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', color: 'white', margin: 0, fontWeight: 'bold' }}>Facturación y Caja</h1>
                    <p style={{ color: '#94a3b8', margin: '0.5rem 0 0 0' }}>Control de Turnos y Cobros</p>
                </div>
                <button
                    onClick={() => setShowTicketConfig(true)}
                    className="btn-secondary"
                    style={{ fontSize: '0.9rem' }}
                >
                    ⚙️ Ticket
                </button>
            </div>

            {/* 1. THE CASH REGISTER DASHBOARD */}
            <div style={{ marginBottom: '2rem' }}>
                <CashRegister
                    onSessionChange={(isOpen) => setIsSessionOpen(isOpen)}
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                />
            </div>

            {/* 2. SEARCH CLIENT TO BILL */}
            {isSessionOpen && viewMode === 'SEARCH' && (
                <div className="animate-fade-in">
                    <div style={{ background: '#1e293b', padding: '1.5rem', borderRadius: '12px', border: '1px solid #334155', marginBottom: '2rem' }}>
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                            <input
                                type="text"
                                placeholder="🔍 Buscar por Nombre, Cédula o Contrato..."
                                className="input-dark"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                style={{ flex: 1, minWidth: '300px', fontSize: '1.1rem' }}
                            />
                        </div>

                        {/* Alphabet Filter */}
                        <div style={{ display: 'flex', gap: '0.25rem', overflowX: 'auto', marginTop: '1rem', paddingBottom: '0.5rem' }} className="scrollbar-hide">
                            <button onClick={() => setLetterFilter('')} className={`btn-letter ${letterFilter === '' ? 'active' : ''}`}>TODOS</button>
                            {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(char => (
                                <button key={char} onClick={() => setLetterFilter(char)} className={`btn-letter ${letterFilter === char ? 'active' : ''}`}>{char}</button>
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
                            <div key={c.id} style={{
                                background: '#0f172a',
                                border: '1px solid #334155',
                                borderRadius: '12px',
                                padding: '1.5rem',
                                borderLeft: c.status === 'active' ? '4px solid #10b981' : '4px solid #ef4444',
                                transition: 'transform 0.2s',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                                    <h3 style={{ margin: 0, color: 'white', fontSize: '1.1rem', fontWeight: '600' }}>{c.full_name}</h3>
                                    <span style={{
                                        fontSize: '0.75rem',
                                        fontWeight: 'bold',
                                        padding: '0.25rem 0.5rem',
                                        borderRadius: '4px',
                                        background: c.status === 'active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                        color: c.status === 'active' ? '#34d399' : '#f87171'
                                    }}>
                                        {c.status === 'active' ? 'ACTIVO' : 'INACTIVO'}
                                    </span>
                                </div>

                                <div style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '1.5rem', display: 'grid', gap: '0.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Zona:</span> <span style={{ color: '#cbd5e1' }}>{c.zone_name || 'N/A'}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Contrato:</span> <span style={{ color: '#cbd5e1' }}>{c.contract_number}</span>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <button
                                        onClick={() => { setSelectedClient(c); setShowBilling(true); }}
                                        className="btn-primary-glow"
                                        style={{ justifyContent: 'center', padding: '0.75rem', fontSize: '0.9rem' }}
                                    >
                                        💲 Cobrar
                                    </button>
                                    <button
                                        onClick={() => openVisitModal(c)}
                                        className="btn-secondary"
                                        style={{ justifyContent: 'center', padding: '0.75rem', fontSize: '0.9rem', border: '1px solid #3b82f6', color: '#60a5fa' }}
                                    >
                                        🛠️ Visita
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

