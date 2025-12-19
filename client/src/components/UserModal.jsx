import React, { useState, useEffect } from 'react';
import CustomAlert from './CustomAlert';

const UserModal = ({ user, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        username: '',
        full_name: '',
        role: 'oficina',
        phone: '',
        identity_document: '',
        password: '',
        is_active: true
    });
    const [alertInfo, setAlertInfo] = useState({ show: false, title: '', message: '', type: 'info' });

    useEffect(() => {
        if (user) {
            setFormData({
                ...user,
                password: ''
            });
        }
    }, [user]);

    const handleCedulaChange = (e) => {
        let val = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
        setFormData({ ...formData, identity_document: val });
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const cedulaRegex = /^\d{3}-\d{6}-\d{4}[A-Z]$/;
        if (!cedulaRegex.test(formData.identity_document)) {
            setAlertInfo({ show: true, type: 'error', title: 'Formato Incorrecto', message: 'La cédula debe ser: 000-000000-0000X' });
            return;
        }

        try {
            const method = user ? 'PUT' : 'POST';
            const url = user
                ? `http://localhost:3001/api/users/${user.id}`
                : 'http://localhost:3001/api/users';

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
                setAlertInfo({ show: true, type: 'error', title: 'Error', message: data.msg || 'Error al guardar usuario' });
            }
        } catch (error) {
            console.error(error);
            setAlertInfo({ show: true, type: 'error', title: 'Error de Conexión', message: 'No se pudo contactar al servidor' });
        }
    };

    return (
        <div className="modal-overlay">
            <div className="glass-card" style={{
                width: '100%', maxWidth: '600px',
                padding: '0',
                overflow: 'hidden',
                background: '#0f172a', /* Solid dark bg for readabiltiy in modal */
                border: '1px solid #334155'
            }}>
                {/* Header */}
                <div style={{
                    padding: '2rem', borderBottom: '1px solid #1e293b',
                    background: '#0b1121'
                }}>
                    <h3 style={{ margin: 0, fontSize: '1.5rem', color: 'white' }}>
                        {user ? 'EDITAR AGENTE' : 'NUEVO AGENTE'}
                    </h3>
                    <p style={{ margin: '5px 0 0', color: '#64748b' }}>
                        Complete los datos del personal.
                    </p>
                </div>

                <form onSubmit={handleSubmit} style={{ padding: '2rem' }}>

                    {/* ID Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8', fontSize: '0.85rem' }}>Cédula</label>
                            <input
                                className="input-dark"
                                name="identity_document"
                                value={formData.identity_document}
                                onChange={handleCedulaChange}
                                required placeholder="000-000-"
                                style={{ fontFamily: 'monospace' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8', fontSize: '0.85rem' }}>Teléfono</label>
                            <input className="input-dark" name="phone" value={formData.phone} onChange={handleChange} placeholder="8888-" />
                        </div>
                    </div>

                    {/* Personal */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8', fontSize: '0.85rem' }}>Nombre Completo</label>
                        <input className="input-dark" name="full_name" value={formData.full_name} onChange={handleChange} required />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8', fontSize: '0.85rem' }}>Usuario</label>
                            <input className="input-dark" name="username" value={formData.username} onChange={handleChange} required />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8', fontSize: '0.85rem' }}>Rol</label>
                            <select className="input-dark" name="role" value={formData.role} onChange={handleChange}>
                                <option value="office">OFICINA</option>
                                <option value="collector">COBRADOR</option>
                                <option value="admin">ADMINISTRADOR</option>
                                <option value="technician">TÉCNICO</option>
                            </select>
                        </div>
                    </div>

                    {/* Footer / Password */}
                    <div style={{ borderTop: '1px solid #1e293b', paddingTop: '1.5rem', marginTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8', fontSize: '0.85rem' }}>
                                {user ? 'Nueva Contraseña' : 'Contraseña'}
                            </label>
                            <input type="password" className="input-dark" name="password" value={formData.password} onChange={handleChange} required={!user} placeholder="******" />
                        </div>

                        <label style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem',
                            border: `1px solid ${formData.is_active ? '#10b981' : '#334155'}`,
                            borderRadius: '12px', cursor: 'pointer',
                            background: formData.is_active ? 'rgba(16, 185, 129, 0.1)' : 'transparent'
                        }}>
                            <input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleChange} />
                            <span style={{ color: formData.is_active ? '#10b981' : '#64748b', fontWeight: 600 }}>
                                {formData.is_active ? 'HABILITADO' : 'DESHABILITADO'}
                            </span>
                        </label>
                    </div>

                    <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                        <button type="button" onClick={onClose} style={{
                            flex: 1, padding: '1rem', background: 'transparent', border: '1px solid #334155', color: '#94a3b8', borderRadius: '12px', cursor: 'pointer', fontWeight: 600
                        }}>
                            CANCELAR
                        </button>
                        <button type="submit" className="btn-dark-glow" style={{ flex: 2 }}>
                            GUARDAR CAMBIOS
                        </button>
                    </div>
                </form>
            </div>
            <CustomAlert isOpen={alertInfo.show} title={alertInfo.title} message={alertInfo.message} type={alertInfo.type} onClose={() => setAlertInfo({ ...alertInfo, show: false })} />
        </div>
    );
};

export default UserModal;
