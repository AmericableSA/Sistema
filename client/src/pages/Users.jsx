import React, { useState, useEffect } from 'react';
// @ts-ignore
import UserModal from '../components/UserModal'; // @ts-ignore
import CustomAlert from '../components/CustomAlert'; // @ts-ignore
import ConfirmModal from '../components/ConfirmModal';

import { API_URL } from '../service/api';

const Users = () => {
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [search, setSearch] = useState('');
    const [alert, setAlert] = useState({ show: false, title: '', message: '', type: 'info' });
    const [confirmDelete, setConfirmDelete] = useState({ show: false, id: null });

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Unauth or Error');
            const data = await res.json();
            setUsers(data);
            setFilteredUsers(data);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        const lowerSearch = search.toLowerCase();
        const filtered = users.filter(u =>
            u.username.toLowerCase().includes(lowerSearch) ||
            u.full_name?.toLowerCase().includes(lowerSearch) ||
            (u.identity_document && u.identity_document.toLowerCase().includes(lowerSearch))
        );
        setFilteredUsers(filtered);
    }, [search, users]);

    const handleCreate = () => {
        setEditingUser(null);
        setShowModal(true);
    };

    const handleEdit = (user) => {
        setEditingUser(user);
        setShowModal(true);
    };

    const requestDelete = (id) => {
        setConfirmDelete({ show: true, id });
    };

    const handleConfirmDelete = async () => {
        const id = confirmDelete.id;
        if (!id) return;

        try {
            const token = localStorage.getItem('token');
            await fetch(`${API_URL}/users/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchUsers();
            setAlert({ show: true, type: 'success', title: 'Eliminado', message: 'Usuario eliminado.' });
        } catch (err) {
            setAlert({ show: true, type: 'error', title: 'Error', message: 'No se pudo eliminar.' });
        } finally {
            setConfirmDelete({ show: false, id: null });
        }
    };

    return (
        <div className="page-container" style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}>

            {/* Dark Header */}
            <div className="animate-entry" style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem',
                borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '2rem'
            }}>
                <div>
                    <h1 style={{ fontSize: '2.5rem', margin: '0 0 0.5rem 0', background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Centro de Comando
                    </h1>
                    <p style={{ color: '#64748b', fontSize: '1.1rem', margin: 0, fontWeight: 500 }}>
                        Administración de Operadores e Ingeniería.
                    </p>
                </div>

                <button className="btn-dark-glow" onClick={handleCreate} style={{ fontSize: '1rem', padding: '1rem 2rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>+</span>
                    CREAR USUARIOS
                </button>
            </div>

            {/* Controls */}
            <div className="animate-entry" style={{ marginBottom: '2.5rem' }}>
                <input
                    type="text"
                    placeholder="Buscar por Nombre, ID o Usuario..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="input-dark"
                    style={{ maxWidth: '400px' }}
                />
            </div>

            {/* Glass Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '2rem' }}>
                {loading ? (
                    <div style={{ color: 'white', textAlign: 'center', gridColumn: '1/-1', padding: '4rem' }}>
                        Cargando Sistema...
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="glass-card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem' }}>
                        <h3 style={{ color: '#94a3b8' }}>No se encontraron resultados</h3>
                    </div>
                ) : filteredUsers.map((u, index) => (
                    <div key={u.id}
                        className="glass-card animate-entry"
                        style={{
                            animationDelay: `${index * 0.05}s`,
                            position: 'relative',
                            opacity: u.is_active ? 1 : 0.6,
                            filter: u.is_active ? 'none' : 'grayscale(100%)'
                        }}
                        onMouseEnter={(e) => {
                            if (!u.is_active) e.currentTarget.style.filter = 'grayscale(0%) opacity(1)';
                        }}
                        onMouseLeave={(e) => {
                            if (!u.is_active) e.currentTarget.style.filter = 'grayscale(100%) opacity(0.6)';
                        }}
                    >
                        {/* Card Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{
                                    width: '60px', height: '60px', borderRadius: '20px',
                                    background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '1.5rem', fontWeight: 800, color: 'white',
                                    boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                                }}>
                                    {u.username.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>{u.full_name}</h3>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <div style={{
                                            width: '8px', height: '8px', borderRadius: '50%',
                                            background: u.is_active ? '#10b981' : '#64748b',
                                            boxShadow: u.is_active ? '0 0 8px #10b981' : 'none'
                                        }}></div>
                                        <span style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                            {u.is_active ? 'OPERATIVO' : 'INACTIVO'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {u.role === 'admin' && (
                                <span style={{
                                    background: 'linear-gradient(135deg, #f59e0b, #b45309)', color: 'white',
                                    padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 800
                                }}>
                                    ADMIN
                                </span>
                            )}
                        </div>

                        {/* Info Rows */}
                        <div style={{ marginBottom: '2rem' }}>
                            <div style={{
                                display: 'flex', justifyContent: 'space-between', padding: '0.8rem 0',
                                borderBottom: '1px solid rgba(255,255,255,0.05)'
                            }}>
                                <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Usuario</span>
                                <span style={{ color: '#e2e8f0', fontWeight: 600 }}>@{u.username}</span>
                            </div>
                            <div style={{
                                display: 'flex', justifyContent: 'space-between', padding: '0.8rem 0',
                                borderBottom: '1px solid rgba(255,255,255,0.05)'
                            }}>
                                <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Rol</span>
                                <span style={{ color: '#60a5fa', fontWeight: 600, textTransform: 'uppercase' }}>{u.role}</span>
                            </div>
                            <div style={{
                                display: 'flex', justifyContent: 'space-between', padding: '0.8rem 0',
                                borderBottom: '1px solid rgba(255,255,255,0.05)'
                            }}>
                                <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Cédula</span>
                                <span style={{ color: '#e2e8f0', fontFamily: 'monospace' }}>{u.identity_document || '--'}</span>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: '1rem', marginTop: 'auto' }}>
                            <button onClick={() => handleEdit(u)} className="btn-dark-glow" style={{ flex: 1, padding: '0.75rem' }}>
                                EDITAR
                            </button>
                            <button onClick={() => requestDelete(u.id)} className="btn-icon btn-delete" title="Eliminar">
                                🗑️
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {showModal && (
                <UserModal
                    user={editingUser}
                    onClose={() => setShowModal(false)}
                    onSave={() => {
                        setShowModal(false);
                        fetchUsers();
                        setAlert({ show: true, type: 'success', title: 'Completado', message: 'Registro actualizado en el sistema.' });
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
        </div>
    );
};

export default Users;
