import React, { useState, useEffect } from 'react';

const ProviderManagerModal = ({ onClose }) => {
    const [providers, setProviders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editId, setEditId] = useState(null);
    const [formData, setFormData] = useState({ name: '', contact_name: '', phone: '', email: '', address: '' });

    // Custom Alert State
    const [alertConfig, setAlertConfig] = useState(null); // { message, onConfirm, type: 'danger'|'info' }

    const fetchProviders = async () => {
        setLoading(true);
        try {
            const res = await fetch('http://localhost:3001/api/providers');
            const data = await res.json();
            setProviders(data);
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    useEffect(() => { fetchProviders(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const url = editId ? `http://localhost:3001/api/providers/${editId}` : 'http://localhost:3001/api/providers';
        const method = editId ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                fetchProviders();
                setFormData({ name: '', contact_name: '', phone: '', email: '', address: '' });
                setEditId(null);
            }
        } catch (err) { console.error(err); }
    };

    const handleEdit = (p) => {
        setEditId(p.id);
        setFormData(p);
    };

    const handleDeleteClick = (id) => {
        setAlertConfig({
            message: '¿Estás seguro de eliminar este proveedor? Esta acción no se puede deshacer.',
            type: 'danger',
            onConfirm: () => confirmDelete(id)
        });
    };

    const confirmDelete = async (id) => {
        try {
            await fetch(`http://localhost:3001/api/providers/${id}`, { method: 'DELETE' });
            fetchProviders();
            setAlertConfig(null);
        } catch (err) { console.error(err); }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100,
            backdropFilter: 'blur(5px)'
        }}>
            <div className="glass-card" style={{ width: '700px', maxHeight: '85vh', overflowY: 'auto', background: '#0f172a', border: '1px solid #334155', borderRadius: '16px' }}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
                    <div>
                        <h3 style={{ margin: 0, color: 'white', fontSize: '1.5rem' }}>🏢 Administrar Proveedores</h3>
                        <p style={{ margin: '0.2rem 0 0 0', color: '#94a3b8', fontSize: '0.9rem' }}>Gestiona tus socios comerciales y contactos.</p>
                    </div>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '2rem', cursor: 'pointer', lineHeight: 1 }}>×</button>
                </div>

                {/* FORM */}
                <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <h4 style={{ margin: '0 0 1rem 0', color: '#60a5fa', fontSize: '1rem' }}>{editId ? '✏️ Editar Proveedor' : '✨ Nuevo Proveedor'}</h4>
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                            <div>
                                <label className="label-dark">Empresa *</label>
                                <input className="input-dark" placeholder="Ej: Cisco Supply" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                            </div>
                            <div>
                                <label className="label-dark">Contacto</label>
                                <input className="input-dark" placeholder="Ej: Maria Import" value={formData.contact_name} onChange={e => setFormData({ ...formData, contact_name: e.target.value })} />
                            </div>
                            <div>
                                <label className="label-dark">Teléfono</label>
                                <input className="input-dark" placeholder="8888-8888" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                            </div>
                            <div>
                                <label className="label-dark">Email</label>
                                <input className="input-dark" placeholder="contacto@empresa.com" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                            </div>
                        </div>
                        <div style={{ marginBottom: '1rem' }}>
                            <label className="label-dark">Dirección</label>
                            <input className="input-dark" placeholder="Dirección completa..." value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} style={{ width: '100%' }} />
                        </div>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button type="submit" className="btn-primary-glow" style={{ flex: 1, padding: '0.8rem' }}>
                                {editId ? 'Actualizar Proveedor' : 'Guardar Nuevo'}
                            </button>
                            {editId && (
                                <button type="button" onClick={() => { setEditId(null); setFormData({ name: '', contact_name: '', phone: '', email: '', address: '' }); }} className="btn-secondary" style={{ padding: '0 1.5rem' }}>
                                    Cancelar
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                {/* LIST */}
                <h4 style={{ color: 'white', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    📂 Lista de Proveedores <span style={{ fontSize: '0.8rem', background: '#334155', padding: '0.2rem 0.6rem', borderRadius: '10px' }}>{providers.length}</span>
                </h4>
                <div style={{ maxHeight: '350px', overflowY: 'auto', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ background: '#1e293b', position: 'sticky', top: 0 }}>
                            <tr>
                                <th style={{ textAlign: 'left', padding: '1rem', color: '#94a3b8', fontWeight: 600 }}>Nombre</th>
                                <th style={{ textAlign: 'left', padding: '1rem', color: '#94a3b8', fontWeight: 600 }}>Contacto</th>
                                <th style={{ textAlign: 'right', padding: '1rem', color: '#94a3b8', fontWeight: 600 }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {providers.length === 0 ? (
                                <tr><td colSpan="3" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No hay proveedores registrados.</td></tr>
                            ) : providers.map(p => (
                                <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }} className="hover-row">
                                    <td style={{ padding: '1rem', color: 'white', fontWeight: 500 }}>
                                        {p.name}
                                        {p.email && <div style={{ fontSize: '0.8rem', color: '#60a5fa', marginTop: '0.2rem' }}>{p.email}</div>}
                                    </td>
                                    <td style={{ padding: '1rem', color: '#cbd5e1' }}>
                                        {p.contact_name || '-'}
                                        {p.phone && <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{p.phone}</div>}
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                            <button onClick={() => handleEdit(p)} className="btn-icon" title="Editar" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)', width: '32px', height: '32px', borderRadius: '6px', cursor: 'pointer' }}>✏️</button>
                                            <button onClick={() => handleDeleteClick(p.id)} className="btn-icon btn-delete" title="Eliminar" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', width: '32px', height: '32px', borderRadius: '6px', cursor: 'pointer' }}>🗑️</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Custom Alert Overlay */}
                {alertConfig && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200
                    }}>
                        <div style={{ background: '#1e293b', border: '1px solid #ef4444', borderRadius: '12px', padding: '2rem', width: '400px', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
                            <h3 style={{ color: 'white', margin: '0 0 0.5rem 0' }}>Confirmar Eliminar</h3>
                            <p style={{ color: '#cbd5e1', marginBottom: '2rem' }}>{alertConfig.message}</p>
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                                <button onClick={() => setAlertConfig(null)} className="btn-secondary" style={{ padding: '0.8rem 1.5rem' }}>Cancelar</button>
                                <button onClick={alertConfig.onConfirm} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '0.8rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Eliminar</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProviderManagerModal;
