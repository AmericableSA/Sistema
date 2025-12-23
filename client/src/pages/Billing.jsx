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

    const handleRequestVisit = async (client) => {
        // Simple manual prompt for now, can be upgraded to modal
        // eslint-disable-next-line no-restricted-globals
        const reason = prompt(`Ingrese el motivo de la visita para ${client.full_name}:`);
        if (!reason) return;

        try {
            const res = await fetch(`/api/clients/${client.id}/manual-order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'REPAIR', description: reason })
            });
            const data = await res.json();
            if (res.ok) {
                setAlert({ show: true, type: 'success', title: 'Visita Solicitada', message: 'Orden de servicio creada exitosamente.' });
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

            <div className="animate-entry" style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', background: 'linear-gradient(to right, #34d399, #10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Facturación y Caja
                </h1>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ color: '#94a3b8', margin: 0 }}>Control de Turnos y Cobros</p>
                    <button
                        onClick={() => setShowTicketConfig(true)}
                        className="btn-dark-glow"
                        style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}
                    >
                        ⚙️ Configurar Ticket
                    </button>
                </div>
            </div>

            {/* 1. THE CASH REGISTER DASHBOARD (Controls visibility via viewMode) */}
            <div className="animate-entry" style={{ marginBottom: '3rem' }}>
                <CashRegister
                    onSessionChange={(isOpen) => setIsSessionOpen(isOpen)}
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                />
            </div>

            {/* 2. SEARCH CLIENT TO BILL (HIDDEN IF SESSION CLOSED OR IN OTHER MODES) */}
            {isSessionOpen && viewMode === 'SEARCH' && (
                <>
                    <div className="animate-entry">
                        <h3 style={{ color: 'white', marginBottom: '1rem' }}>🔎 Buscar Cliente para Cobrar</h3>

                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                            <input
                                type="text"
                                placeholder="Escriba nombre, cédula o contrato..."
                                className="input-dark"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                style={{ flex: 1, minWidth: '300px', fontSize: '1.2rem', padding: '1rem' }}
                            />
                        </div>

                        {/* Alphabet Filter Strip */}
                        <div className="animate-entry" style={{
                            display: 'flex', gap: '0.25rem', overflowX: 'auto', paddingBottom: '1rem', marginBottom: '1rem',
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                            scrollbarWidth: 'thin'
                        }}>
                            <button
                                onClick={() => setLetterFilter('')}
                                className={`btn-letter ${letterFilter === '' ? 'active' : ''}`}
                                style={{
                                    padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 'bold',
                                    background: letterFilter === '' ? '#34d399' : 'rgba(255,255,255,0.05)',
                                    color: letterFilter === '' ? 'white' : '#94a3b8',
                                    border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', whiteSpace: 'nowrap',
                                    transition: 'all 0.2s'
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
                                        minWidth: '36px',
                                        padding: '0.5rem', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 'bold',
                                        background: letterFilter === char ? '#34d399' : 'rgba(255,255,255,0.05)',
                                        color: letterFilter === char ? 'white' : '#94a3b8',
                                        border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {char}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 3. RESULTS GRID (Optimized for Billing) */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.5rem', marginTop: '2rem' }}>
                        {loading && <div style={{ color: 'white', gridColumn: '1/-1', textAlign: 'center' }}>Buscando...</div>}

                        {!loading && clients.length === 0 && (
                            <div style={{ color: '#64748b', gridColumn: '1/-1', textAlign: 'center', padding: '2rem' }}>
                                No se encontraron clientes. Busque por nombre o use el filtro de letras.
                            </div>
                        )}

                        {!loading && clients.map((c, i) => (
                            <div key={c.id} className="glass-card animate-entry" style={{ animationDelay: `${i * 0.05}s`, borderLeft: c.status === 'active' ? '4px solid #10b981' : '4px solid #ef4444' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <h4 style={{ margin: 0, color: 'white' }}>{c.full_name}</h4>
                                    <span style={{ color: c.status === 'active' ? '#34d399' : '#f87171', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                        {c.status === 'active' ? 'ACTIVO' : 'INACTIVO'}
                                    </span>
                                </div>
                                <div style={{ fontSize: '0.9rem', color: '#cbd5e1', marginBottom: '1rem' }}>
                                    <div>Zona: {c.zone_name || 'N/A'}</div>
                                    <div>Contrato: {c.contract_number}</div>
                                </div>
                                <button
                                    onClick={() => { setSelectedClient(c); setShowBilling(true); }}
                                    className="btn-dark-glow"
                                    style={{ width: '100%', background: '#059669', borderColor: '#34d399', color: 'white', justifyContent: 'center' }}
                                >
                                    💲 REALIZAR COBRO
                                </button>
                                <button
                                    onClick={() => handleRequestVisit(c)}
                                    className="btn-secondary-glow"
                                    style={{ width: '100%', marginTop: '0.5rem', color: '#60a5fa', borderColor: '#3b82f6', background: 'rgba(59, 130, 246, 0.1)', justifyContent: 'center' }}
                                >
                                    🛠️ SOLICITAR VISITA
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* PAGINATION CONTROLS */}
                    {!loading && totalPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem', paddingBottom: '2rem' }}>
                            <button
                                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                                disabled={page === 1}
                                className="btn-secondary"
                            >
                                ⬅ Anterior
                            </button>
                            <span style={{ display: 'flex', alignItems: 'center', color: '#94a3b8' }}>
                                Página <strong style={{ color: 'white', margin: '0 0.5rem' }}>{page}</strong> de {totalPages}
                            </span>
                            <button
                                onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={page === totalPages}
                                className="btn-secondary"
                            >
                                Siguiente ➡
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* BILLING MODAL */}
            {showBilling && (
                <BillingModal
                    client={selectedClient}
                    onClose={() => setShowBilling(false)}
                    onPaymentSuccess={() => {
                        setShowBilling(false);
                        setRefreshTrigger(prev => prev + 1); // Trigger re-fetch
                        setAlert({ show: true, type: 'success', title: 'Pago Exitoso', message: 'Cobro registrado y caja actualizada.' });
                    }}
                />
            )}

            <CustomAlert
                isOpen={alert.show}
                title={alert.title}
                message={alert.message}
                type={alert.type}
                onClose={() => setAlert({ ...alert, show: false })}
            />

            {/* TICKET CONFIG MODAL */}
            {showTicketConfig && (
                <ReceiptSettingsModal onClose={() => setShowTicketConfig(false)} />
            )}
        </div>
    );
};

export default Billing;

