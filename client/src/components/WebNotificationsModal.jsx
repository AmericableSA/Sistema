import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import ConfirmModal from './ConfirmModal';
import ClientSearchModal from './ClientSearchModal';

const WebNotificationsModal = ({ onClose, onAssignClient }) => {
    const [activeTab, setActiveTab] = useState('averias');
    const [averias, setAverias] = useState([]);
    const [contactos, setContactos] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filters
    const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
    const [filterStatus, setFilterStatus] = useState('Pendiente'); // 'Pendiente' | 'all' | 'Atendido'

    // Delete Confirmation State
    const [confirm, setConfirm] = useState({ show: false, title: '', message: '', id: null, type: null });

    // Client Search for Averia Assignment
    const [searchModal, setSearchModal] = useState({ show: false, averia: null });

    useEffect(() => {
        fetchData();
        fetchUsers();
    }, [activeTab, filterDate, filterStatus]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch BOTH to ensure tab counts are accurate immediately
            const [averiasRes, contactosRes] = await Promise.all([
                fetch(`/api/notifications/averias?status=${filterStatus}&startDate=${filterDate}&endDate=${filterDate}`),
                fetch(`/api/notifications/contactos?status=all`)
            ]);

            setAverias(await averiasRes.json());
            setContactos(await contactosRes.json());
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/users');
            setUsers(await res.json());
        } catch (e) { }
    };

    const downloadFile = async (url, filename) => {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error('Download failed');
            const blob = await res.blob();
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Error downloading file:', error);
            alert('Error al descargar el archivo.');
        }
    };

    const handleAssignContact = async (id, userId) => {
        // Optimistic UI Update
        const updatedContactos = contactos.map(c =>
            c.id === id ? { ...c, assigned_user_id: userId, atendido: 1 } : c
        );
        setContactos(updatedContactos);

        try {
            await fetch(`/api/notifications/contactos/${id}/assign`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId })
            });
            // No strict need to re-fetch if optimistic update works, but can do silently
        } catch (error) {
            console.error(error);
            fetchData(); // Revert on error
        }
    };

    const handleResolveAveria = async (id, status) => {
        try {
            await fetch(`/api/notifications/averias/${id}/resolve`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            fetchData();
        } catch (e) {
            console.error(e);
            alert('Error al actualizar estado.');
        }
    };

    const handleAssignAveria = (averia) => {
        // Step 1: Open Client Search with pre-filled name
        setSearchModal({ show: true, averia });
    };

    // ... (rest of functions) ...

    // INSIDE RENDER (Averias Table Row)
    <tr key={a.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <td style={{ padding: '1rem' }}>{new Date(a.fecha_reporte).toLocaleDateString()}</td>
        <td style={{ padding: '1rem', fontWeight: 'bold', color: 'white' }}>{a.nombre_completo}</td>
        <td style={{ padding: '1rem' }}>{a.telefono_contacto}</td>
        <td style={{ padding: '1rem' }}>{a.zona_barrio}</td>
        <td style={{ padding: '1rem', maxWidth: '300px' }}>{a.detalles_averia}</td>
        <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {a.estado === 'Pendiente' ? (
                <>
                    <button
                        onClick={() => handleResolveAveria(a.id, 'Revisado')}
                        className="btn-secondary"
                        style={{ fontSize: '0.8rem', padding: '0.5rem', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid #059669' }}
                        title="Marcar como Revisado (Sin Asignar)"
                    >
                        ✓ Revisado
                    </button>
                    <button
                        onClick={() => handleAssignAveria(a)}
                        className="btn-primary-glow"
                        style={{ fontSize: '0.8rem', padding: '0.5rem' }}
                    >
                        ➡️ Asignar
                    </button>
                </>
            ) : (
                <span style={{
                    padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold',
                    background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid #166534'
                }}>
                    {a.estado}
                </span>
            )}
            <button
                onClick={() => handleDeleteClick(a.id, 'averia')}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem', marginLeft: 'auto' }}
                title="Eliminar"
            >
                🗑️
            </button>
        </td>
    </tr>

    {
        activeTab === 'contactos' && (
            <div className="animate-fade-in">
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                    <button onClick={() => downloadFile('/api/notifications/contactos/export', 'Contactos_Web.xlsx')} className="btn-secondary">📥 Exportar Excel</button>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', color: '#cbd5e1' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid #334155', textAlign: 'left', color: '#94a3b8' }}>
                            <th style={{ padding: '1rem' }}>Fecha</th>
                            <th style={{ padding: '1rem' }}>Nombre</th>
                            <th style={{ padding: '1rem' }}>Whatsapp</th>
                            <th style={{ padding: '1rem' }}>Mensaje</th>
                            <th style={{ padding: '1rem' }}>Estado</th>
                            <th style={{ padding: '1rem' }}>Asignado A</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Cargando...</td></tr> :
                            contactos.map(c => (
                                <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '1rem' }}>{new Date(c.fecha_contacto).toLocaleDateString()}</td>
                                    <td style={{ padding: '1rem', fontWeight: 'bold', color: 'white' }}>{c.nombre_completo}</td>
                                    <td style={{ padding: '1rem' }}>{c.telefono_whatsapp}</td>
                                    <td style={{ padding: '1rem', maxWidth: '250px' }}>{c.mensaje}</td>
                                    <td style={{ padding: '1rem' }}>
                                        <button
                                            onClick={() => handleToggleStatus(c.id, !c.atendido)}
                                            style={{
                                                background: c.atendido ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                                color: c.atendido ? '#34d399' : '#f87171',
                                                border: 'none', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer'
                                            }}
                                        >
                                            {c.atendido ? 'Atendido' : 'Pendiente'}
                                        </button>
                                    </td>
                                    <td style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <select
                                            className="input-dark"
                                            style={{ padding: '0.25rem', maxWidth: '120px' }}
                                            value={c.assigned_user_id || ''}
                                            onChange={(e) => handleAssignContact(c.id, e.target.value)}
                                        >
                                            <option value="">-- Sin Asignar --</option>
                                            {users.map(u => (
                                                <option key={u.id} value={u.id}>{u.username}</option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={() => handleDeleteClick(c.id, 'contacto')}
                                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem', marginLeft: 'auto' }}
                                            title="Eliminar"
                                        >
                                            🗑️
                                        </button>
                                    </td>
                                </tr>
                            ))}
                    </tbody>
                </table>
            </div>
        )
    }
            </div >
            <style>{`
                .modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.7); display: flex; align-items: center; justifyContent: center; z-index: 99999; backdrop-filter: blur(5px); }
            `}</style>

            <ClientSearchModal
                isOpen={searchModal.show}
                initialQuery={searchModal.averia?.nombre_completo || ''}
                onClose={() => setSearchModal({ ...searchModal, show: false })}
                onSelect={handleClientSelect}
            />

            <ConfirmModal
                isOpen={confirm.show}
                title={confirm.title}
                message={confirm.message}
                onConfirm={handleConfirmDelete}
                onCancel={() => setConfirm({ ...confirm, show: false })}
            />
        </div >,
    document.body
    );
};

export default WebNotificationsModal;
