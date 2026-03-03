import React, { useState, useEffect } from 'react';

const NeighborhoodModal = ({ onClose, cities }) => {
    const [selectedCityId, setSelectedCityId] = useState(cities?.[0]?.id || '');
    const [neighborhoods, setNeighborhoods] = useState([]);
    const [form, setForm] = useState({ id: null, name: '' });
    const [loading, setLoading] = useState(false);

    const fetchNeighborhoods = async (cityId) => {
        if (!cityId) { setNeighborhoods([]); return; }
        const res = await fetch(`/api/cities/${cityId}/neighborhoods`);
        const data = await res.json();
        setNeighborhoods(data);
    };

    useEffect(() => {
        if (selectedCityId) fetchNeighborhoods(selectedCityId);
    }, [selectedCityId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedCityId) return alert('Seleccione una ciudad primero');
        setLoading(true);

        const url = form.id
            ? `/api/cities/${selectedCityId}/neighborhoods/${form.id}`
            : `/api/cities/${selectedCityId}/neighborhoods`;
        const method = form.id ? 'PUT' : 'POST';

        await fetch(url, {
            method, headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: form.name })
        });

        setForm({ id: null, name: '' });
        fetchNeighborhoods(selectedCityId);
        setLoading(false);
    };

    const handleEdit = (n) => setForm({ id: n.id, name: n.name });
    const handleReset = () => setForm({ id: null, name: '' });

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (window.confirm('¿Eliminar este barrio?')) {
            const res = await fetch(`/api/cities/${selectedCityId}/neighborhoods/${id}`, { method: 'DELETE' });
            if (!res.ok) {
                const data = await res.json();
                alert(data.message || 'No se puede eliminar');
                return;
            }
            fetchNeighborhoods(selectedCityId);
            if (form.id === id) handleReset();
        }
    };

    return (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
            <div className="glass-card" style={{ width: '900px', maxWidth: '95vw', height: '600px', maxHeight: '90vh', background: '#0f172a', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
                {/* Header */}
                <div style={{ padding: '1.5rem', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0b1121' }}>
                    <h3 style={{ margin: 0, color: 'white', fontSize: '1.25rem' }}>GESTIÓN DE BARRIOS</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
                </div>

                {/* City Selector */}
                <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #334155', background: '#1e293b' }}>
                    <label style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.5rem', display: 'block', fontWeight: 500 }}>Ciudad</label>
                    <select className="input-dark" value={selectedCityId} onChange={(e) => { setSelectedCityId(e.target.value); handleReset(); }} style={{ maxWidth: '300px' }}>
                        <option value="">Seleccione ciudad...</option>
                        {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>

                <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                    {/* Left: List */}
                    <div style={{ width: '40%', borderRight: '1px solid #334155', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '1rem', background: '#1e293b', borderBottom: '1px solid #334155' }}>
                            <h4 style={{ margin: 0, color: '#94a3b8', fontSize: '0.85rem', textTransform: 'uppercase' }}>Barrios ({neighborhoods.length})</h4>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                            {!selectedCityId ? (
                                <div style={{ color: '#64748b', textAlign: 'center', marginTop: '2rem' }}>Seleccione una ciudad</div>
                            ) : neighborhoods.length === 0 ? (
                                <div style={{ color: '#64748b', textAlign: 'center', marginTop: '2rem' }}>No hay barrios registrados</div>
                            ) : neighborhoods.map(n => (
                                <div key={n.id} onClick={() => handleEdit(n)} style={{
                                    padding: '1rem', marginBottom: '0.8rem', borderRadius: '8px', cursor: 'pointer',
                                    background: form.id === n.id ? 'rgba(59, 130, 246, 0.2)' : '#1e293b',
                                    border: form.id === n.id ? '1px solid #3b82f6' : '1px solid transparent',
                                    transition: 'all 0.2s'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ color: 'white', fontWeight: 'bold' }}>{n.name}</div>
                                        <button onClick={(e) => handleDelete(e, n.id)} className="btn-icon btn-delete" style={{ padding: '4px' }}>🗑️</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right: Form */}
                    <div style={{ flex: 1, padding: '2rem', display: 'flex', flexDirection: 'column', background: 'rgba(15, 23, 42, 0.5)' }}>
                        <h4 style={{ color: '#3b82f6', marginTop: 0, marginBottom: '2rem', fontSize: '1.1rem' }}>
                            {form.id ? 'Editar Barrio' : 'Crear Nuevo Barrio'}
                        </h4>

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div>
                                <label style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.5rem', display: 'block', fontWeight: 500 }}>Nombre del Barrio</label>
                                <input className="input-dark" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="Ej: Bo. San Antonio" style={{ fontSize: '1rem', padding: '0.8rem' }} />
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                {form.id && (
                                    <button type="button" onClick={handleReset} style={{ flex: 1, padding: '1rem', background: '#334155', border: 'none', color: 'white', borderRadius: '8px', cursor: 'pointer' }}>
                                        Cancelar / Nuevo
                                    </button>
                                )}
                                <button type="submit" className="btn-dark-glow" style={{ flex: 1, justifyContent: 'center' }} disabled={loading || !selectedCityId}>
                                    {form.id ? 'Guardar Cambios' : 'Crear Barrio'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NeighborhoodModal;
