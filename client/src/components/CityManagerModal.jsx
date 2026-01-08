import React, { useState, useEffect } from 'react';
import CustomAlert from './CustomAlert';

const CityManagerModal = ({ onClose }) => {
    const [cities, setCities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [name, setName] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [alert, setAlert] = useState({ show: false, type: '', message: '' });

    useEffect(() => {
        fetchCities();
    }, []);

    const fetchCities = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/cities');
            const data = await res.json();
            setCities(data);
        } catch (error) {
            console.error(error);
            setAlert({ show: true, type: 'error', message: 'Error cargando ciudades' });
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;

        try {
            const method = editingId ? 'PUT' : 'POST';
            const url = editingId ? `/api/cities/${editingId}` : '/api/cities';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });

            if (!res.ok) throw new Error('Error guardando ciudad');

            setName('');
            setEditingId(null);
            fetchCities();
            setAlert({ show: true, type: 'success', message: editingId ? 'Ciudad actualizada' : 'Ciudad creada' });
        } catch (error) {
            setAlert({ show: true, type: 'error', message: 'No se pudo guardar la ciudad' });
        }
    };

    const handleEdit = (city) => {
        setName(city.name);
        setEditingId(city.id);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Seguro que desea eliminar esta ciudad?')) return;

        try {
            const res = await fetch(`/api/cities/${id}`, { method: 'DELETE' });
            const data = await res.json();

            if (!res.ok) {
                setAlert({ show: true, type: 'error', message: data.message || 'Error eliminando ciudad' });
                return;
            }

            fetchCities();
            setAlert({ show: true, type: 'success', message: 'Ciudad eliminada' });
        } catch (error) {
            setAlert({ show: true, type: 'error', message: 'Error de conexión' });
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '600px', width: '90%' }}>
                <div className="modal-header">
                    <h2>Gestionar Ciudades</h2>
                    <button onClick={onClose} className="close-btn">&times;</button>
                </div>

                <div className="modal-body">
                    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                        <input
                            type="text"
                            placeholder="Nombre de la Ciudad"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="input-dark"
                            style={{ flex: 1 }}
                            autoFocus
                        />
                        <button type="submit" className="btn-primary">
                            {editingId ? 'Actualizar' : 'Agregar'}
                        </button>
                        {editingId && (
                            <button type="button" onClick={() => { setName(''); setEditingId(null); }} className="btn-secondary">
                                Cancelar
                            </button>
                        )}
                    </form>

                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        {loading ? <p>Cargando...</p> : (
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid #333' }}>
                                        <th style={{ textAlign: 'left', padding: '0.5rem' }}>Nombre</th>
                                        <th style={{ textAlign: 'right', padding: '0.5rem' }}>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cities.map(city => (
                                        <tr key={city.id} style={{ borderBottom: '1px solid #222' }}>
                                            <td style={{ padding: '0.75rem 0.5rem' }}>{city.name}</td>
                                            <td style={{ textAlign: 'right', padding: '0.5rem' }}>
                                                <button
                                                    onClick={() => handleEdit(city)}
                                                    className="btn-icon"
                                                    style={{ marginRight: '0.5rem', color: '#60a5fa' }}
                                                >
                                                    ✏️
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(city.id)}
                                                    className="btn-icon"
                                                    style={{ color: '#f87171' }}
                                                >
                                                    🗑️
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {cities.length === 0 && (
                                        <tr>
                                            <td colSpan="2" style={{ textAlign: 'center', padding: '1rem', color: '#666' }}>
                                                No hay ciudades registradas
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            <CustomAlert
                isOpen={alert.show}
                type={alert.type}
                message={alert.message}
                onClose={() => setAlert({ ...alert, show: false })}
            />

            <style>{`
                .modal-overlay {
                    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0, 0, 0, 0.7);
                    display: flex; justify-content: center; align-items: center;
                    z-index: 1000;
                    backdrop-filter: blur(5px);
                }
                .modal-content {
                    background: #1e293b;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    padding: 0;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                    animation: modalEntry 0.3s ease-out;
                }
                .modal-header {
                    padding: 1.5rem;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                    display: flex; justify-content: space-between; align-items: center;
                }
                .modal-header h2 { margin: 0; color: white; font-size: 1.5rem; }
                .close-btn {
                    background: none; border: none; color: #94a3b8; font-size: 2rem;
                    cursor: pointer; line-height: 1;
                }
                .close-btn:hover { color: white; }
                .modal-body { padding: 1.5rem; }
                @keyframes modalEntry {
                    from { opacity: 0; transform: scale(0.95) translateY(20px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default CityManagerModal;
