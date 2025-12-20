import React, { useState, useEffect } from 'react';
import { API_URL } from '../service/api';

const ZoneModal = ({ onClose }) => {
    const [zones, setZones] = useState([]);
    const [form, setForm] = useState({ id: null, name: '', tariff: '', description: '' });
    const [loading, setLoading] = useState(false);

    // Fetch zones
    const fetchZones = async () => {
        const res = await fetch(`${API_URL}/zones`);
        const data = await res.json();
        setZones(data);
    };

    useEffect(() => { fetchZones(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const url = form.id
            ? `${API_URL}/zones/${form.id}`
            : `${API_URL}/zones`;
        const method = form.id ? 'PUT' : 'POST';

        await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form)
        });

        setForm({ id: null, name: '', tariff: '', description: '' });
        fetchZones();
        setLoading(false);
    };

    const handleEdit = (z) => {
        setForm({ ...z, tariff: z.tariff }); // Populate form
    };

    const handleReset = () => {
        setForm({ id: null, name: '', tariff: '', description: '' });
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation(); // Prevent edit trigger
        if (window.confirm('¿Eliminar esta zona?')) {
            await fetch(`${API_URL}/zones/${id}`, { method: 'DELETE' });
            fetchZones();
            if (form.id === id) handleReset();
        }
    };

    return (
        <div className="modal-overlay">
            <div className="glass-card" style={{ width: '900px', height: '600px', background: '#0f172a', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
                {/* Header */}
                <div style={{ padding: '1.5rem', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0b1121' }}>
                    <h3 style={{ margin: 0, color: 'white', fontSize: '1.25rem' }}>GESTIÓN DE ZONAS Y TARIFAS</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
                </div>

                <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                    {/* Left: Zone List */}
                    <div style={{ width: '40%', borderRight: '1px solid #334155', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '1rem', background: '#1e293b', borderBottom: '1px solid #334155' }}>
                            <h4 style={{ margin: 0, color: '#94a3b8', fontSize: '0.85rem', textTransform: 'uppercase' }}>Zonas Existentes ({zones.length})</h4>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                            {zones.map(z => (
                                <div key={z.id} onClick={() => handleEdit(z)} style={{
                                    padding: '1rem', marginBottom: '0.8rem', borderRadius: '8px', cursor: 'pointer',
                                    background: form.id === z.id ? 'rgba(59, 130, 246, 0.2)' : '#1e293b',
                                    border: form.id === z.id ? '1px solid #3b82f6' : '1px solid transparent',
                                    transition: 'all 0.2s'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                                        <div style={{ color: 'white', fontWeight: 'bold' }}>{z.name}</div>
                                        <button onClick={(e) => handleDelete(e, z.id)} className="btn-icon btn-delete" style={{ padding: '4px' }}>🗑️</button>
                                    </div>
                                    <div style={{ color: '#4ade80', fontSize: '0.9rem', fontWeight: 600 }}>C$ {z.tariff}</div>
                                    {z.description && <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{z.description}</div>}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right: Form */}
                    <div style={{ flex: 1, padding: '2rem', display: 'flex', flexDirection: 'column', background: 'rgba(15, 23, 42, 0.5)' }}>
                        <h4 style={{ color: '#3b82f6', marginTop: 0, marginBottom: '2rem', fontSize: '1.1rem' }}>
                            {form.id ? 'Editar Zona' : 'Crear Nueva Zona'}
                        </h4>

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div>
                                <label className="label-dark">Nombre de Zona</label>
                                <input className="input-dark" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="Ej: Zona Centro" style={{ fontSize: '1rem', padding: '0.8rem' }} />
                            </div>
                            <div>
                                <label className="label-dark">Tarifa Estándar (C$)</label>
                                <input type="number" className="input-dark" value={form.tariff} onChange={e => setForm({ ...form, tariff: e.target.value })} required placeholder="0.00" style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#4ade80' }} />
                            </div>
                            <div>
                                <label className="label-dark">Descripción (Opcional)</label>
                                <textarea className="input-dark" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows="4" placeholder="Detalles sobre el área..." />
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                {form.id && (
                                    <button type="button" onClick={handleReset} style={{ flex: 1, padding: '1rem', background: '#334155', border: 'none', color: 'white', borderRadius: '8px', cursor: 'pointer' }}>
                                        Cancelar / Nuevo
                                    </button>
                                )}
                                <button type="submit" className="btn-dark-glow" style={{ flex: 1, justifyContent: 'center' }} disabled={loading}>
                                    {form.id ? 'Guardar Cambios' : 'Crear Zona'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <style>{` .label-dark { color: #94a3b8; font-size: 0.85rem; margin-bottom: 0.5rem; display: block; font-weight: 500; } `}</style>
        </div>
    );
};

export default ZoneModal;
