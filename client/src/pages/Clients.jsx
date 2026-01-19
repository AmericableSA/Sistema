import React, { useState, useEffect } from 'react';
// @ts-ignore
import ClientModal from '../components/ClientModal'; // @ts-ignore
import CustomAlert from '../components/CustomAlert';
import ConfirmModal from '../components/ConfirmModal';
// @ts-ignore
import HistoryModal from '../components/HistoryModal';
// @ts-ignore
import ZoneModal from '../components/ZoneModal'; // @ts-ignore
import BulkUploadModal from '../components/BulkUploadModal';
import CityManagerModal from '../components/CityManagerModal';
import { useAuth } from '../context/AuthContext';

const Clients = () => {
    // Data State
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);

    // UI State
    const [showModal, setShowModal] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [initialHistoryTab, setInitialHistoryTab] = useState('logs'); // 'logs' or 'invoices'
    const [showZoneModal, setShowZoneModal] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showCityModal, setShowCityModal] = useState(false);
    const [selectedClient, setSelectedClient] = useState(null);
    const [alert, setAlert] = useState({ show: false, title: '', message: '', type: 'info' });
    const [confirmDelete, setConfirmDelete] = useState({ show: false, id: null });

    // Filter State (Backend)
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [letterFilter, setLetterFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(30);
    const [totalPages, setTotalPages] = useState(1);
    const [totalClients, setTotalClients] = useState(0);

    const { user } = useAuth();

    // Debounce Search Logic
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            if (search !== debouncedSearch) setCurrentPage(1); // Reset to page 1 on new search
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    // Active View Logic (Hides the main grid to save performance/focus)
    const isViewActive = showModal || showHistory || showZoneModal || showUploadModal;

    // Fetch Clients (Backend Filtered)
    const fetchClients = async (page = 1) => {
        setLoading(true);
        try {
            // Build Query Params for Backend
            const params = new URLSearchParams({
                page: page,
                limit: itemsPerPage,
                search: debouncedSearch,
                start_letter: letterFilter,
                status: statusFilter
            });

            // Added cache: 'no-store' to prevent browser caching issues
            const res = await fetch(`/api/clients?${params.toString()}`, { cache: 'no-store' });

            if (!res.ok) throw new Error('Error en el servidor');

            const data = await res.json();

            if (data.clients) {
                setClients(data.clients);
                setTotalPages(data.totalPages);
                setCurrentPage(data.currentPage);
                setTotalClients(data.total);
            } else {
                setClients(data); // Fallback
            }
        } catch (err) {
            console.error(err);
            setAlert({ show: true, type: 'error', title: 'Error de Conexión', message: 'No se pudieron cargar los clientes.' });
            setClients([]); // Clear list on error to avoid confusion
        } finally {
            setLoading(false);
        }
    };

    // Refetch when params change
    useEffect(() => {
        fetchClients(currentPage);
    }, [currentPage, itemsPerPage, debouncedSearch, letterFilter, statusFilter]);

    // Handle Delete
    const handleDelete = (id) => {
        setConfirmDelete({ show: true, id });
    };

    // Handle Export
    const handleExport = async () => {
        try {
            setAlert({ show: true, type: 'info', title: 'Exportando...', message: 'Generando archivo Excel, por favor espere.' });

            const params = new URLSearchParams({
                search: debouncedSearch,
                start_letter: letterFilter,
                status: statusFilter
            });

            const res = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/clients/export-xls?${params.toString()}`);

            if (!res.ok) throw new Error('Error generando reporte');

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'Reporte_Clientes.xlsx'; // Force extension
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            setAlert({ show: true, type: 'success', title: 'Éxito', message: 'Reporte descargado correctamente.' });
        } catch (error) {
            console.error(error);
            setAlert({ show: true, type: 'error', title: 'Error', message: 'No se pudo exportar el archivo. Intente nuevamente.' });
        }
    };

    const confirmDeleteAction = async () => {
        if (!confirmDelete.id) return;
        try {
            await fetch(`/api/clients/${confirmDelete.id}`, { method: 'DELETE' });
            fetchClients(currentPage);
            setAlert({ show: true, type: 'success', title: 'Eliminado', message: 'Cliente eliminado correctamente.' });
        } catch (err) {
            setAlert({ show: true, type: 'error', title: 'Error', message: 'No se pudo eliminar.' });
        } finally {
            setConfirmDelete({ show: false, id: null });
        }
    };

    return (
        <div className="page-container" style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}>

            {/* Header (Always Visible) */}
            <div className="animate-entry header-flex" style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem',
                borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '2rem'
            }}>
                <div>
                    <h1 style={{ fontSize: '2.5rem', margin: '0 0 0.5rem 0', background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Gestión de Clientes
                    </h1>
                    <p style={{ color: '#64748b', fontSize: '1.1rem', margin: 0, fontWeight: 500 }}>
                        Base de datos de servicio (Tarifas, Zonas y Estados).
                    </p>
                </div>

                <div className="header-actions" style={{ display: 'flex', gap: '1rem' }}>
                    {/* EXPORT BUTTON */}
                    <button
                        className="btn-dark-glow"
                        onClick={handleExport}
                        style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399' }}
                    >
                        Exportar Excel
                    </button>

                    <button
                        className="btn-dark-glow"
                        onClick={() => setShowCityModal(true)}
                        style={{ background: 'rgba(236, 72, 153, 0.1)', border: '1px solid rgba(236, 72, 153, 0.3)', color: '#f472b6' }}
                    >
                        Gestionar Ciudades
                    </button>

                    {user?.role === 'admin' && (
                        <button className="btn-dark-glow" onClick={() => setShowUploadModal(true)} style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399' }}>
                            Carga Masiva
                        </button>
                    )}
                    <button className="btn-dark-glow" onClick={() => setShowZoneModal(true)} style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                        Gestionar Zonas
                    </button>
                    <button className="btn-dark-glow" onClick={() => { setSelectedClient(null); setShowHistory(true); }} style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                        Historial Global
                    </button>
                    <button className="btn-dark-glow" onClick={() => { setSelectedClient(null); setShowModal(true); }} style={{ fontSize: '1rem', padding: '1rem 2rem' }}>
                        <span style={{ fontSize: '1.2rem' }}>+</span>
                        NUEVO CLIENTE
                    </button>
                </div>
            </div>

            {/* Modals & Alerts */}
            {showCityModal && <CityManagerModal onClose={() => setShowCityModal(false)} />}
            {showZoneModal && <ZoneModal onClose={() => setShowZoneModal(false)} />}
            {showModal && (
                <ClientModal
                    client={selectedClient}
                    onClose={() => setShowModal(false)}
                    onSave={() => {
                        setShowModal(false);
                        fetchClients(currentPage);
                        setAlert({ show: true, type: 'success', title: 'Guardado', message: 'Información actualizada.' });
                    }}
                />
            )}
            {showHistory && (
                <HistoryModal
                    client={selectedClient}
                    global={!selectedClient}
                    onClose={() => { setShowHistory(false); setInitialHistoryTab('logs'); }}
                    initialTab={initialHistoryTab}
                />
            )}
            {showUploadModal && (
                <BulkUploadModal
                    onClose={() => setShowUploadModal(false)}
                    onUpload={() => {
                        setShowUploadModal(false);
                        fetchClients(1);
                        setAlert({ show: true, type: 'success', title: 'Carga Completa', message: 'Los clientes han sido importados exitosamente.' });
                    }}
                />
            )}
            <ConfirmModal
                isOpen={confirmDelete.show}
                title="¿Eliminar Cliente?"
                message="Esta acción no se puede deshacer. Se perderá el historial asociado."
                onConfirm={confirmDeleteAction}
                onCancel={() => setConfirmDelete({ show: false, id: null })}
                type="confirm"
            />
            <CustomAlert
                isOpen={alert.show}
                title={alert.title}
                message={alert.message}
                type={alert.type}
                onClose={() => setAlert({ ...alert, show: false })}
            />

            {/* Main Content (Hidden if any view is active to optimize performance) */}
            {!isViewActive && (
                <>
                    {/* Controls & Search */}
                    <div className="animate-entry" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>

                        {/* Global Backend Search */}
                        <div style={{ flex: 1, minWidth: '300px' }}>
                            <input
                                type="text"
                                placeholder="🔍 Buscar Global (Nombre, Cédula, Contrato)..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="input-dark"
                                style={{ width: '100%', height: '50px', fontSize: '1.1rem' }}
                            />
                        </div>

                        {/* Status Filter (Backend) */}
                        <select
                            className="input-dark"
                            style={{ maxWidth: '250px', height: '50px' }}
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                setCurrentPage(1);
                            }}
                        >
                            <option value="all">📁 Todos los Estados</option>
                            <option value="up_to_date">✅ Al Día</option>
                            <option value="in_arrears">⚠️ En Mora</option>
                            <option value="active">🟢 Activos (Todos)</option>
                            <option value="suspended">🔒 Cortado por mora</option>
                            <option value="disconnected_by_request">🔌 Desconexión a Solicitud</option>
                        </select>
                    </div>

                    {/* Alphabet Filter Strip (Backend Filter) */}
                    <div className="animate-entry" style={{
                        display: 'flex', gap: '0.25rem', overflowX: 'auto', paddingBottom: '1rem', marginBottom: '1.5rem',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        scrollbarWidth: 'thin'
                    }}>
                        <button
                            onClick={() => { setLetterFilter(''); setCurrentPage(1); }}
                            className={`btn-letter ${letterFilter === '' ? 'active' : ''}`}
                            style={{
                                padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 'bold',
                                background: letterFilter === '' ? '#3b82f6' : 'rgba(255,255,255,0.05)',
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
                                onClick={() => { setLetterFilter(char); setCurrentPage(1); }}
                                className={`btn-letter ${letterFilter === char ? 'active' : ''}`}
                                style={{
                                    minWidth: '36px',
                                    padding: '0.5rem', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 'bold',
                                    background: letterFilter === char ? '#3b82f6' : 'rgba(255,255,255,0.05)',
                                    color: letterFilter === char ? 'white' : '#94a3b8',
                                    border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {char}
                            </button>
                        ))}
                    </div>

                    {/* Clients Grid */}
                    <div className="clients-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
                        {loading ? <div style={{ color: 'white', width: '100%', textAlign: 'center', padding: '2rem' }}>Cargando Clientes...</div> :
                            clients.length === 0 ? <div style={{ color: '#64748b', gridColumn: '1/-1', textAlign: 'center', padding: '2rem' }}>No se encontraron clientes con estos filtros.</div> :
                                clients.map((c, i) => (
                                    <div key={c.id} className="glass-card animate-entry" style={{ animationDelay: `${i * 0.05}s`, position: 'relative' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                                            <div>
                                                <h3 style={{ fontSize: '1.2rem', color: 'white', marginBottom: '0.25rem' }}>{c.full_name}</h3>
                                                <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>{c.address_street || 'Sin dirección'}</div>
                                            </div>
                                            <span style={{
                                                padding: '0.25rem 0.75rem', borderRadius: '50px',
                                                fontSize: '0.75rem', fontWeight: 700,
                                                background: c.status === 'active' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                                color: c.status === 'active' ? '#4ade80' : '#f87171',
                                                border: c.status === 'active' ? '1px solid #166534' : '1px solid #991b1b'
                                            }}>
                                                {c.status === 'active' ? 'ACTIVO' : 'CORTADO'}
                                            </span>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '1.5rem' }}>
                                            <div><span style={{ color: '#64748b' }}>Contrato:</span> {c.contract_number || '--'}</div>
                                            <div><span style={{ color: '#64748b' }}>Tel:</span> {c.phone_primary || '--'}</div>
                                            <div><span style={{ color: '#64748b' }}>Zona:</span> {c.zone_name || 'General'}</div>
                                            <div><span style={{ color: '#64748b' }}>Vence:</span> {c.last_paid_month ? new Date(c.last_paid_month).toLocaleDateString() : '--'}</div>
                                        </div>

                                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                                            <button onClick={() => { setSelectedClient(c); setShowHistory(true); }} className="btn-secondary" style={{ flex: '0 0 auto', padding: '0.5rem', background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.3)' }} title="Ver Bitácora de Cambios">
                                                🕒 Historial
                                            </button>
                                            <button onClick={() => { setSelectedClient(c); setInitialHistoryTab('invoices'); setShowHistory(true); }} className="btn-secondary" style={{ flex: '0 0 auto', padding: '0.5rem', background: 'rgba(245, 158, 11, 0.1)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)' }} title="Ver Historial de Facturas">
                                                🧾 Facturas
                                            </button>
                                            <button onClick={() => { setSelectedClient(c); setShowModal(true); }} className="btn-dark-glow" style={{ flex: 1, padding: '0.5rem' }}>
                                                Editar
                                            </button>
                                            <button onClick={() => handleDelete(c.id)} className="btn-icon btn-delete" title="Eliminar">🗑️</button>
                                        </div>
                                    </div>
                                ))}
                    </div>

                    {/* Pagination Controls */}
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '3rem', paddingBottom: '2rem' }}>
                        <button
                            className="btn-dark-glow"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            style={{ opacity: currentPage === 1 ? 0.5 : 1, padding: '0.75rem 1.5rem' }}
                        >
                            ⬅️ Anterior
                        </button>
                        <span style={{ color: 'white', fontWeight: 'bold' }}>
                            Página {currentPage} de {totalPages} ({totalClients} Resultados)
                        </span>
                        <button
                            className="btn-dark-glow"
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            style={{ opacity: currentPage === totalPages ? 0.5 : 1, padding: '0.75rem 1.5rem' }}
                        >
                            Siguiente ➡️
                        </button>
                    </div>

                    <style>{`
                        @media (max-width: 768px) {
                            .page-container { padding: 1rem !important; }
                            .header-flex { flex-direction: column; align-items: flex-start; gap: 1.5rem; }
                            .header-actions { width: 100%; flex-wrap: wrap; }
                            .header-actions button { flex: 1; text-align: center; justify-content: center; }
                            .clients-grid { grid-template-columns: 1fr !important; }
                        }
                    `}</style>
                </>
            )}

        </div>
    );
};

export default Clients;

