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
        last_payment_date: '',
        cutoff_date: '',
        cutoff_reason: '',
        reconnection_date: '',
        installation_date: '', // New Field
        preferred_collector_id: ''
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
                fetch('/api/zones'),
                fetch('/api/cities'),
                fetch('/api/users')
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
                installation_date: formatDate(client.installation_date), // Load it
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

    // PHONE MASKING LOGIC (0000-0000)
    const handlePhoneChange = (e) => {
        const { name, value } = e.target;
        let val = value.replace(/\D/g, ''); // Remove non-digits
        if (val.length > 8) val = val.slice(0, 8); // Max 8 digits

        // Add hyphen
        if (val.length > 4) {
            val = val.slice(0, 4) + '-' + val.slice(4);
        }

        setFormData({ ...formData, [name]: val });
    };

    // CEDULA MASKING LOGIC (000-000000-0000X)
    const handleCedulaChange = (e) => {
        let { value } = e.target;
        // Limit to reasonable max length (14 chars + 2 dashes = 16)
        let val = value.toUpperCase();

        // Remove existing dashes to re-calculate
        const clean = val.replace(/-/g, '');

        // Rebuild with dashes
        // xxx-xxxxxx-xxxx
        let formatted = clean;
        if (clean.length > 3) {
            formatted = clean.slice(0, 3) + '-' + clean.slice(3);
        }
        if (clean.length > 9) { // 3 + 6 = 9
            formatted = formatted.slice(0, 10) + '-' + formatted.slice(10);
        }

        // Limit total length just in case
        if (formatted.length > 16) formatted = formatted.slice(0, 16);

        setFormData({ ...formData, identity_document: formatted });
    };

    // NOTES Logic
    const [notes, setNotes] = useState([]);
    const [newNote, setNewNote] = useState('');
    const [editingNoteId, setEditingNoteId] = useState(null);
    const [editContent, setEditContent] = useState('');

    useEffect(() => {
        if (client && client.id) {
            fetchNotes();
        } else {
            setNotes([]);
        }
    }, [client]);

    const fetchNotes = async () => {
        try {
            const res = await fetch(`/api/clients/${client.id}/notes`);
            if (res.ok) setNotes(await res.json());
        } catch (e) { console.error(e); }
    };

    const handleAddNote = async () => {
        if (!newNote.trim()) return;
        try {
            const res = await fetch(`/api/clients/${client.id}/notes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ note_content: newNote })
            });
            if (res.ok) {
                setNewNote('');
                fetchNotes();
            }
        } catch (e) {
            console.error(e);
            alert('Error al agregar nota');
        }
    };

    const handleDeleteNote = async (noteId) => {
        if (!confirm('¿Eliminar nota?')) return;
        try {
            const res = await fetch(`/api/clients/notes/${noteId}`, { method: 'DELETE' });
            if (res.ok) fetchNotes();
        } catch (e) { console.error(e); }
    };

    const startEditNote = (note) => {
        setEditingNoteId(note.id);
        setEditContent(note.note_content);
    };

    const saveEditNote = async () => {
        if (!editContent.trim()) return;
        try {
            const res = await fetch(`/api/clients/notes/${editingNoteId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ note_content: editContent })
            });
            if (res.ok) {
                setEditingNoteId(null);
                setEditContent('');
                fetchNotes();
            }
        } catch (e) { console.error(e); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Validation (Cedula no longer required)
            if (!formData.full_name || !formData.address_street || !formData.zone_id || !formData.phone_primary) {
                alert("Por favor complete todos los campos obligatorios (Nombre, Dirección, Zona, Teléfono).");
                return;
            }

            const method = client ? 'PUT' : 'POST';
            const url = client
                ? `/api/clients/${client.id}`
                : '/api/clients';

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

                <div style={{ padding: '2rem', maxHeight: '80vh', overflowY: 'auto' }}>
                    <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>

                        {/* Left Column: Personal Info */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <h4 style={{ color: '#3b82f6', marginBottom: '0.5rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Datos Principales</h4>

                            <div>
                                <label className="label-dark">Nombre Completo *</label>
                                <input className="input-dark" name="full_name" value={formData.full_name} onChange={handleChange} required />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label className="label-dark">Cédula (Opcional)</label>
                                    <input className="input-dark" name="identity_document" value={formData.identity_document} onChange={handleCedulaChange} placeholder="xxx-xxxxxx-xxxx" />
                                </div>
                                <div>
                                    <label className="label-dark">Teléfono * (0000-0000)</label>
                                    <input
                                        className="input-dark"
                                        name="phone_primary"
                                        value={formData.phone_primary}
                                        onChange={handlePhoneChange}
                                        placeholder="8888-8888"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Secondary Phone */}
                            <div>
                                <label className="label-dark">Teléfono Adicional (Opcional)</label>
                                <input
                                    className="input-dark"
                                    name="phone_secondary"
                                    value={formData.phone_secondary || ''}
                                    onChange={handlePhoneChange}
                                    placeholder="8888-8888"
                                />
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
                                        <option value="">Sin asignar</option>
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
                                    <label className="label-dark">Contrato / Item (Auto)</label>
                                    <input className="input-dark" name="contract_number" value={formData.contract_number} onChange={handleChange} placeholder="Dejar vacío para auto-generar" />
                                </div>
                                <div>
                                    <label className="label-dark">Estado</label>
                                    <select className="input-dark" name="status" value={formData.status} onChange={handleChange}>
                                        <option value="active">Activo</option>
                                        <option value="suspended">Cortado por mora</option>
                                        <option value="disconnected_by_request">Desconexión a Solicitud</option>
                                        <option value="promotions">Promociones</option>
                                        <option value="courtesy">Cortesía</option>
                                        <option value="provider">Proveedor</option>
                                        <option value="office">Oficina</option>
                                    </select>
                                </div>
                            </div>

                            {/* Payment Info */}
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

                            {/* INSTALLATION DATE */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                                <div>
                                    <label className="label-dark" style={{ color: '#22c55e' }}>Fecha Instalación</label>
                                    <input type="date" className="input-dark" name="installation_date" value={formData.installation_date} onChange={handleChange} />
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

                    {/* NOTES SECTION */}
                    {client && client.id && (
                        <div style={{ marginTop: '2rem', borderTop: '1px solid #334155', paddingTop: '2rem' }}>
                            <h4 style={{ color: '#a78bfa', marginBottom: '1rem', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>📝 Notas del Cliente</h4>

                            {/* Add Note */}
                            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                                <input
                                    className="input-dark"
                                    placeholder="Escribir nueva nota..."
                                    value={newNote}
                                    onChange={(e) => setNewNote(e.target.value)}
                                    style={{ flex: 1 }}
                                />
                                <button type="button" onClick={handleAddNote} className="btn-primary-glow" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                                    Agregar Nota
                                </button>
                            </div>

                            {/* List Notes */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                {notes.length === 0 ? <p style={{ color: '#64748b' }}>No hay notas registradas.</p> : notes.map(note => (
                                    <div key={note.id} style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        {editingNoteId === note.id ? (
                                            <div style={{ display: 'flex', gap: '0.5rem', flex: 1, marginRight: '1rem' }}>
                                                <input
                                                    className="input-dark"
                                                    value={editContent}
                                                    onChange={(e) => setEditContent(e.target.value)}
                                                    style={{ flex: 1 }}
                                                    autoFocus
                                                />
                                                <button onClick={saveEditNote} style={{ color: '#22c55e', background: 'none', border: 'none', cursor: 'pointer' }}>💾</button>
                                                <button onClick={() => setEditingNoteId(null)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>✖</button>
                                            </div>
                                        ) : (
                                            <div style={{ flex: 1 }}>
                                                <p style={{ margin: 0, color: '#e2e8f0', fontSize: '0.95rem' }}>{note.note_content}</p>
                                                <small style={{ color: '#64748b', fontSize: '0.75rem' }}>{new Date(note.created_at).toLocaleString()}</small>
                                            </div>
                                        )}

                                        {editingNoteId !== note.id && (
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button onClick={() => startEditNote(note)} style={{ color: '#fbbf24', background: 'none', border: 'none', cursor: 'pointer' }}>✎</button>
                                                <button onClick={() => handleDeleteNote(note.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
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

