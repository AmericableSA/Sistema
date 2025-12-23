import React, { useState, useEffect } from 'react';
// @ts-ignore
import ZoneModal from './ZoneModal';

const ClientModal = ({ client, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        full_name: '',
        identity_document: '',
        contract_number: '',
        phone_primary: '',
        address_street: '',
        city_id: '',
        neighborhood_id: 1,
        zone_id: '',
        status: 'active',
        last_paid_month: '',
        last_payment_date: '', // New
        cutoff_date: '',
        cutoff_reason: '',
        reconnection_date: '',
        preferred_collector_id: '' // New
    });

    const [zones, setZones] = useState([]);
    const [cities, setCities] = useState([]);
    const [collectors, setCollectors] = useState([]);
    const [showZoneModal, setShowZoneModal] = useState(false);

    useEffect(() => {
        fetchCatalogs();
    }, []);

    const fetchCatalogs = async () => {
        try {
            const [resZones, resCities, resUsers] = await Promise.all([
                fetch('http://localhost:3001/api/zones'),
                fetch('http://localhost:3001/api/cities'),
                fetch('http://localhost:3001/api/users')
            ]);

            const dZones = await resZones.json();
            setZones(dZones);
            setCities(await resCities.json());
            const dUsers = await resUsers.json();
            setCollectors(dUsers); // Ideally filter by role, but showing all for now allows flexibility

            if (dZones.length > 0 && !client) {
                setFormData(prev => ({ ...prev, zone_id: dZones[0].id }));
            }
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        if (client) {
            // Robust ISO date parsing (strips time/timezone issues by taking first 10 chars of ISO string from DB)
            const formatDate = (d) => {
                if (!d) return '';
                if (typeof d === 'string') return d.split('T')[0];
                return new Date(d).toISOString().split('T')[0];
            };

            setFormData({
                ...client,
                last_paid_month: formatDate(client.last_paid_month),
                last_payment_date: formatDate(client.last_payment_date),
                cutoff_date: formatDate(client.cutoff_date),
                reconnection_date: formatDate(client.reconnection_date),
                zone_id: client.zone_id || (zones.length > 0 ? zones[0].id : ''),
                city_id: client.city_id || '',
                preferred_collector_id: client.preferred_collector_id || ''
            });
        }
    }, [client, zones]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Validation
            if (!formData.full_name || !formData.address_street || !formData.zone_id) {
                alert("Por favor complete todos los campos obligatorios.");
                return;
            }

            const method = client ? 'PUT' : 'POST';
            const url = client
                ? `http://localhost:3001/api/clients/${client.id}`
                : 'http://localhost:3001/api/clients';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();
            if (response.ok) {
                onSave();
                onClose();
            } else {
                alert(data.msg || 'Error al guardar');
            }
        } catch (error) {
            console.error(error);
            alert('Error de conexión');
        }
    };

    return (
        <div className="modal-overlay">
            <div className="glass-card" style={{
                width: '100%', maxWidth: '950px',
                padding: '0', overflow: 'hidden',
                background: '#0f172a',
                border: '1px solid #334155'
            }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid #1e293b', background: '#0b1121' }}>
                    <h3 style={{ margin: 0, fontSize: '1.5rem', color: 'white' }}>
                        {client ? 'EDITAR CLIENTE' : 'NUEVO CLIENTE'}
                    </h3>
                </div>

                <form onSubmit={handleSubmit} style={{ padding: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', maxHeight: '80vh', overflowY: 'auto' }}>

                    {/* Left Column: Personal Info */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <h4 style={{ color: '#3b82f6', marginBottom: '0.5rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Datos Principales</h4>

                        <div>
                            <label className="label-dark">Nombre Completo *</label>
                            <input className="input-dark" name="full_name" value={formData.full_name} onChange={handleChange} required />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label className="label-dark">Cédula *</label>
                                <input className="input-dark" name="identity_document" value={formData.identity_document} onChange={handleChange} required />
                            </div>
                            <div>
                                <label className="label-dark">Teléfono *</label>
                                <input className="input-dark" name="phone_primary" value={formData.phone_primary} onChange={handleChange} required />
                            </div>
                        </div>

                        <div>
                            <label className="label-dark">Dirección (Calle) *</label>
                            <textarea className="input-dark" name="address_street" value={formData.address_street} onChange={handleChange} rows="2" required />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label className="label-dark">Ciudad</label>
                                <select className="input-dark" name="city_id" value={formData.city_id} onChange={handleChange}>
                                    <option value="">Seleccione...</option>
                                    {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="label-dark">Colector Asignado</label>
                                <select className="input-dark" name="preferred_collector_id" value={formData.preferred_collector_id} onChange={handleChange}>
                                    <option value="">Ninguno / Oficina</option>
                                    {collectors.map(u => <option key={u.id} value={u.id}>{u.full_name || u.username}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Zone Selector */}
                        <div style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <label className="label-dark" style={{ color: '#60a5fa' }}>Zona de Cobro *</label>
                                <button type="button" onClick={() => setShowZoneModal(true)} style={{ background: 'none', border: 'none', color: '#60a5fa', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}>
                                    + Gestionar Zonas
                                </button>
                            </div>
                            <select className="input-dark" name="zone_id" value={formData.zone_id} onChange={handleChange} required>
                                <option value="">Seleccione Zona...</option>
                                {zones.map(z => (
                                    <option key={z.id} value={z.id}>{z.name} - C$ {z.tariff}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Right Column: Service Info */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <h4 style={{ color: '#f59e0b', marginBottom: '0.5rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Servicio & Estado</h4>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label className="label-dark">Contrato / Item *</label>
                                <input className="input-dark" name="contract_number" value={formData.contract_number} onChange={handleChange} required />
                            </div>
                            <div>
                                <label className="label-dark">Estado</label>
                                <select className="input-dark" name="status" value={formData.status} onChange={handleChange}>
                                    <option value="active">Activo</option>
                                    <option value="suspended">Cortado / Suspendido</option>
                                    <option value="disconnected">Retirado</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label className="label-dark">Mes Pagado (Vencimiento)</label>
                                <input type="date" className="input-dark" name="last_paid_month" value={formData.last_paid_month} onChange={handleChange} />
                            </div>
                            <div>
                                <label className="label-dark">F. Último Pago</label>
                                <input type="date" className="input-dark" name="last_payment_date" value={formData.last_payment_date} onChange={handleChange} />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label className="label-dark" style={{ color: '#fca5a5' }}>Datos de Corte (Opcional)</label>
                            </div>
                            <div>
                                <label className="label-dark" style={{ fontSize: '0.8rem' }}>Fecha Corte</label>
                                <input type="date" className="input-dark" name="cutoff_date" value={formData.cutoff_date} onChange={handleChange} />
                            </div>
                            <div>
                                <label className="label-dark" style={{ fontSize: '0.8rem' }}>Motivo</label>
                                <input className="input-dark" name="cutoff_reason" value={formData.cutoff_reason} onChange={handleChange} placeholder="Ej: Mora" />
                            </div>
                            <div>
                                <label className="label-dark" style={{ fontSize: '0.8rem' }}>Fecha Reconexión</label>
                                <input type="date" className="input-dark" name="reconnection_date" value={formData.reconnection_date} onChange={handleChange} />
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem', borderTop: '1px solid #1e293b', paddingTop: '1.5rem' }}>
                        <button type="button" onClick={onClose} style={{ padding: '0.75rem 1.5rem', background: 'transparent', border: '1px solid #475569', color: '#94a3b8', borderRadius: '12px', cursor: 'pointer' }}>
                            Cancelar
                        </button>
                        <button type="submit" className="btn-dark-glow">
                            Guardar Cliente
                        </button>
                    </div>
                </form>
            </div>

            {showZoneModal && (
                <ZoneModal onClose={() => { setShowZoneModal(false); fetchZones(); }} />
            )}

            <style>{`
                .label-dark { display: block; margin-bottom: 0.4rem; color: #94a3b8; fontSize: 0.85rem; font-weight: 500; }
                
                /* Mobile Responsiveness */
                @media (max-width: 768px) {
                    form {
                        grid-template-columns: 1fr !important;
                        padding: 1.5rem !important;
                        gap: 1.5rem !important;
                    }
                    .glass-card {
                        border-radius: 0 !important;
                        height: 100vh !important;
                        max-height: 100vh !important;
                        width: 100% !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default ClientModal;
