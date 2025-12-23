
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
// @ts-ignore
import CustomAlert from '../components/CustomAlert';

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
    // Actions: 'CHANGE_NAME', 'CHANGE_ADDRESS', 'DISCONNECT_REQ', 'DISCONNECT_MORA', 'NONE'

    // Form State
    const [formValue, setFormValue] = useState('');
    const [formReason, setFormReason] = useState('');
    const [actionLoading, setActionLoading] = useState(false);



    // Order State
    const [orders, setOrders] = useState([]);
    const [techs, setTechs] = useState([]);
    const [loadingOrders, setLoadingOrders] = useState(false);

    const [alert, setAlert] = useState({ show: false, title: '', message: '', type: 'info' });

    // Debounce Search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    // Fetch Clients (Reused logic from Billing/Clients)
    useEffect(() => {
        const fetchClients = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams({
                    page: 1,
                    limit: 50,
                    search: debouncedSearch,
                    start_letter: letterFilter,
                    status: 'all'
                });

                const res = await fetch(`http://localhost:3001/api/clients?${params.toString()}`, { cache: 'no-store' });
                const data = await res.json();

                if (data.clients) {
                    setClients(data.clients);
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
    }, [debouncedSearch, letterFilter]);


    const handleSelectClient = (client) => {
        setSelectedClient(client);
        setSelectedAction(''); // Reset action
        setFormValue('');
        setFormReason('');
        fetchOrders(client.id);
        fetchTechs();
    };

    const fetchOrders = async (clientId) => {
        setLoadingOrders(true);
        try {
            const res = await fetch(`http://localhost:3001/api/clients/${clientId}/orders`);
            const data = await res.json();
            setOrders(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error(e);
        } finally { setLoadingOrders(false); }
    };

    const fetchTechs = async () => {
        if (techs.length > 0) return;
        try {
            const res = await fetch(`http://localhost:3001/api/clients/technicians/list`);
            const data = await res.json();
            setTechs(data);
        } catch (e) { console.error(e); }
    };

    const handleUpdateOrder = async (orderId, field, value) => {
        // Optimistic Update
        const oldOrders = [...orders];
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, [field]: value } : o));

        try {
            // Prepare payload
            const order = orders.find(o => o.id === orderId);
            const payload = { ...order, [field]: value };

            await fetch(`http://localhost:3001/api/clients/orders/${orderId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (field === 'status' && value === 'COMPLETED') {
                setAlert({ show: true, type: 'success', title: 'Orden Finalizada', message: 'La orden ha sido completada.' });
            }

        } catch (e) {
            console.error(e);
            setOrders(oldOrders); // Revert
            setAlert({ show: true, type: 'error', title: 'Error', message: 'No se pudo actualizar la orden.' });
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
                user_id: 1 // TODO: Auth User ID
            };

            const res = await fetch('http://localhost:3001/api/clients/movements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (res.ok) {
                setAlert({ show: true, type: 'success', title: 'Trámite Registrado', message: 'El movimiento ha sido guardado exitosamente.' });
                setSelectedClient(null); // Reset flow
                setSelectedAction('');
                // Refresh client list if name changed
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

    return (
        <div className="page-container" style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>

            <div className="animate-entry" style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', background: 'linear-gradient(to right, #60a5fa, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Gestión de Trámites
                </h1>
                <p style={{ color: '#94a3b8', margin: 0 }}>Registro de cambios, traslados y desconexiones.</p>
            </div>

            {/* STEP 1: CLIENT SELECTION (Billing Style) */}
            {!selectedClient && (
                <div className="animate-entry">
                    <h3 style={{ color: 'white', marginBottom: '1rem' }}>👤 Seleccionar Cliente para Trámite</h3>

                    {/* Controls */}
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                        <input
                            type="text"
                            placeholder="Buscar por Nombre, Cédula o Contrato..."
                            className="input-dark"
                            value={search}
                            onChange={e => setSearch(e.target.value)} // Corrected
                            style={{ flex: 1, minWidth: '300px', fontSize: '1.2rem', padding: '1rem' }}
                        />
                    </div>

                    {/* Alphabet */}
                    <div style={{ display: 'flex', gap: '0.25rem', overflowX: 'auto', paddingBottom: '1rem', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', scrollbarWidth: 'thin' }}>
                        <button onClick={() => setLetterFilter('')} className={`btn-letter ${letterFilter === '' ? 'active' : ''}`} style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: letterFilter === '' ? '#3b82f6' : 'rgba(255,255,255,0.05)', color: letterFilter === '' ? 'white' : '#94a3b8', cursor: 'pointer', border: 'none' }}>TODOS</button>
                        {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(char => (
                            <button key={char} onClick={() => setLetterFilter(char)} className={`btn-letter ${letterFilter === char ? 'active' : ''}`} style={{ minWidth: '36px', padding: '0.5rem', borderRadius: '8px', background: letterFilter === char ? '#3b82f6' : 'rgba(255,255,255,0.05)', color: letterFilter === char ? 'white' : '#94a3b8', cursor: 'pointer', border: 'none' }}>{char}</button>
                        ))}
                    </div>

                    {/* Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem', marginTop: '2rem' }}>
                        {loading && <div style={{ color: 'white', gridColumn: '1/-1', textAlign: 'center' }}>Buscando...</div>}
                        {!loading && clients.length === 0 && <div style={{ color: '#64748b', gridColumn: '1/-1', textAlign: 'center' }}>No se encontraron resultados.</div>}

                        {!loading && clients.map((c, i) => (
                            <div key={c.id} className="glass-card animate-entry" style={{ animationDelay: `${i * 0.05}s` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <h4 style={{ margin: 0, color: 'white' }}>{c.full_name}</h4>
                                    <span style={{ color: c.status === 'active' ? '#34d399' : '#f87171', fontSize: '0.8rem', fontWeight: 'bold' }}>{c.status.toUpperCase()}</span>
                                </div>
                                <div style={{ fontSize: '0.9rem', color: '#cbd5e1', marginBottom: '1rem' }}>
                                    <div>Dirección: {c.address_street || 'N/A'}</div>
                                    <div>Contrato: {c.contract_number}</div>
                                </div>
                                <button
                                    onClick={() => handleSelectClient(c)}
                                    className="btn-primary-glow"
                                    style={{ width: '100%', justifyContent: 'center' }}
                                >
                                    📝 Gestionar Trámite
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* STEP 2: MOVEMENT FORM */}
            {selectedClient && (
                <div className="animate-entry">
                    <button onClick={() => setSelectedClient(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        ⬅ Volver a Búsqueda
                    </button>

                    <div className="glass-card" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', background: '#0f172a' }}>
                        <div style={{ borderBottom: '1px solid #334155', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
                            <h2 style={{ color: 'white', margin: 0 }}>Gestionando: {selectedClient.full_name}</h2>
                            <p style={{ color: '#94a3b8', margin: '0.5rem 0 0 0' }}>Estado Actual: <span style={{ color: selectedClient.status === 'active' ? '#4ade80' : '#f87171' }}>{selectedClient.status.toUpperCase()}</span></p>
                            <p style={{ color: '#64748b', margin: 0 }}>{selectedClient.address_street}</p>
                        </div>

                        {/* Action Select */}
                        {!selectedAction ? (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <button onClick={() => setSelectedAction('CHANGE_NAME')} className="btn-dark-glow" style={{ padding: '1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
                                    <span style={{ fontSize: '2rem' }}>📝</span>
                                    <span style={{ fontWeight: 'bold' }}>Cambio de Razón Social</span>
                                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Corregir o cambiar nombre del titular</span>
                                </button>

                                <button onClick={() => setSelectedAction('CHANGE_ADDRESS')} className="btn-dark-glow" style={{ padding: '1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
                                    <span style={{ fontSize: '2rem' }}>📍</span>
                                    <span style={{ fontWeight: 'bold' }}>Cambio de Dirección</span>
                                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Traslado de servicio</span>
                                </button>

                                <button onClick={() => setSelectedAction('DISCONNECT_REQ')} className="btn-dark-glow" style={{ padding: '1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                                    <span style={{ fontSize: '2rem' }}>✂️</span>
                                    <span style={{ fontWeight: 'bold', color: '#f87171' }}>Desconexión (Solicitud)</span>
                                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Cliente solicita baja voluntaria</span>
                                </button>

                                <button onClick={() => setSelectedAction('DISCONNECT_MORA')} className="btn-dark-glow" style={{ padding: '1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                                    <span style={{ fontSize: '2rem' }}>⚖️</span>
                                    <span style={{ fontWeight: 'bold', color: '#f87171' }}>Desconexión (Mora)</span>
                                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Corte por falta de pago</span>
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmitMovement} className="animate-fade-in">
                                <button type="button" onClick={() => setSelectedAction('')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', marginBottom: '1rem' }}>
                                    ⬅ Cambiar Acción
                                </button>

                                <h3 style={{ borderLeft: '4px solid #3b82f6', paddingLeft: '1rem', color: 'white', marginBottom: '1.5rem' }}>
                                    {selectedAction === 'CHANGE_NAME' && 'Cambio de Nombre / Titular'}
                                    {selectedAction === 'CHANGE_ADDRESS' && 'Cambio de Dirección / Traslado'}
                                    {selectedAction === 'DISCONNECT_REQ' && 'Solicitud de Baja'}
                                    {selectedAction === 'DISCONNECT_MORA' && 'Corte por Mora'}
                                </h3>

                                <div style={{ display: 'grid', gap: '1.5rem' }}>
                                    {/* DYNAMIC FIELD based on Action */}
                                    {selectedAction === 'CHANGE_NAME' && (
                                        <div>
                                            <label className="label-dark">Nuevo Nombre Completo (Razón Social)</label>
                                            <input className="input-dark" value={formValue} onChange={e => setFormValue(e.target.value)} required placeholder={`Actual: ${selectedClient.full_name}`} />
                                        </div>
                                    )}

                                    {selectedAction === 'CHANGE_ADDRESS' && (
                                        <div>
                                            <label className="label-dark">Nueva Dirección Exacta</label>
                                            <textarea className="input-dark" value={formValue} onChange={e => setFormValue(e.target.value)} required placeholder={`Actual: ${selectedClient.address_street}`} rows="3" />
                                        </div>
                                    )}

                                    {/* Common Reason Field */}
                                    <div>
                                        <label className="label-dark">Motivo / Observaciones (Requerido)</label>
                                        <textarea className="input-dark" value={formReason} onChange={e => setFormReason(e.target.value)} required rows="3" placeholder="Explique brevemente el motivo del trámite..." />
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                                        <button type="button" onClick={() => setSelectedAction('')} className="btn-secondary">Cancelar</button>
                                        <button type="submit" disabled={actionLoading} className="btn-primary-glow" style={{ minWidth: '150px' }}>
                                            {actionLoading ? 'Guardando...' : 'Confirmar Cambios'}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        )}

                    </div>


                    {/* SECTION: SERVICE ORDERS */}
                    <div className="animate-entry" style={{ maxWidth: '800px', margin: '2rem auto' }}>
                        <h3 style={{ color: 'white', borderBottom: '1px solid #334155', paddingBottom: '0.5rem' }}>🛠️ Órdenes de Servicio (Instalaciones / Reparaciones)</h3>

                        {loadingOrders && <div style={{ color: '#94a3b8' }}>Cargando órdenes...</div>}

                        {!loadingOrders && orders.length === 0 && (
                            <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', color: '#94a3b8', textAlign: 'center' }}>
                                No hay órdenes de servicio recientes.
                            </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                            {orders.map(order => (
                                <div key={order.id} className="glass-card" style={{ padding: '1rem', borderLeft: order.status === 'COMPLETED' ? '4px solid #10b981' : '4px solid #f59e0b' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <span style={{ fontWeight: 'bold', color: 'white' }}>{order.type}</span>
                                        <span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>{new Date(order.created_at).toLocaleDateString()}</span>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'center' }}>
                                        <div>
                                            <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.25rem' }}>Estado</label>
                                            <select
                                                className="input-dark"
                                                style={{ padding: '0.25rem' }}
                                                value={order.status}
                                                onChange={(e) => handleUpdateOrder(order.id, 'status', e.target.value)}
                                            >
                                                <option value="PENDING">PENDIENTE</option>
                                                <option value="IN_PROGRESS">EN PROCESO</option>
                                                <option value="COMPLETED">FINALIZADA</option>
                                                <option value="CANCELLED">CANCELADA</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.25rem' }}>Técnico Asignado</label>
                                            <select
                                                className="input-dark"
                                                style={{ padding: '0.25rem' }}
                                                value={order.assigned_tech_id || ''}
                                                onChange={(e) => handleUpdateOrder(order.id, 'assigned_tech_id', e.target.value)}
                                            >
                                                <option value="">-- Sin Asignar --</option>
                                                {techs.map(t => (
                                                    <option key={t.id} value={t.id}>{t.full_name || t.username}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            ))}
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
        </div >
    );
};

export default ClientMovements;
