import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
    { label: 'Menú Principal', path: '/', icon: '🏠', roles: null },
    { label: 'Facturación / Caja', path: '/billing', icon: '💳', roles: ['admin', 'office', 'oficina', 'collector'] },
    { label: 'Clientes', path: '/clients', icon: '👥', roles: ['admin', 'office', 'oficina', 'technician'] },
    { label: 'Trámites', path: '/movements', icon: '📋', roles: ['admin', 'office', 'collector'] },
    { label: 'Inventario', path: '/inventory', icon: '📦', roles: ['admin'] },
    { label: 'Reportes', path: '/reports', icon: '📊', roles: ['admin'] },
    { label: 'Usuarios', path: '/users', icon: '🔐', roles: ['admin'] },
];

const ROLE_LABELS = {
    admin: 'Administrador',
    cajero: 'Cajero',
    oficinista: 'Oficinista',
    oficina: 'Oficina',
    office: 'Oficina',
    bodeguero: 'Bodeguero',
    collector: 'Cobrador',
    technician: 'Técnico',
};

const Sidebar = ({ isOpen, onClose }) => {
    const location = useLocation();
    const { user, hasRole, logout } = useAuth();

    if (!user) return null;

    const visibleItems = NAV_ITEMS.filter(item => {
        if (!item.roles) return true;
        return hasRole(item.roles);
    });

    const roleLabel = ROLE_LABELS[user?.role] || user?.role || 'Usuario';
    const initials = (user?.full_name || user?.username || 'U')
        .split(' ')
        .map(w => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

    return (
        <>
            {/* Logo + Branding */}
            <div style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
            }}>
                <div style={{
                    width: '38px', height: '38px', borderRadius: '10px',
                    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.2rem', flexShrink: 0
                }}>
                    📡
                </div>
                <div>
                    <h1 style={{
                        margin: 0, fontSize: '1.1rem', fontWeight: 800,
                        background: 'linear-gradient(90deg, #fff, #94a3b8)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        letterSpacing: '-0.5px', lineHeight: 1.2
                    }}>
                        AMERI-CABLE
                    </h1>
                    <span style={{ fontSize: '0.65rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Sistema de Gestión
                    </span>
                </div>
            </div>

            {/* Usuario activo */}
            <div style={{
                padding: '1rem 1.5rem',
                margin: '0.5rem 0.75rem',
                borderRadius: '12px',
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.15)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
            }}>
                <div style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.9rem', fontWeight: 800, color: 'white', flexShrink: 0
                }}>
                    {initials}
                </div>
                <div style={{ minWidth: 0 }}>
                    <p style={{
                        margin: 0, fontSize: '0.88rem', fontWeight: 700, color: 'white',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                    }}>
                        {user.full_name || user.username}
                    </p>
                    <span style={{ fontSize: '0.7rem', color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                        {roleLabel}
                    </span>
                </div>
            </div>

            {/* Navegación */}
            <nav style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0' }}>
                {visibleItems.map(item => {
                    const isActive = location.pathname === item.path;
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            onClick={onClose}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '0.75rem 1.25rem',
                                margin: '0.2rem 0.75rem',
                                borderRadius: '12px',
                                textDecoration: 'none',
                                gap: '0.85rem',
                                color: isActive ? '#fff' : '#94A3B8',
                                backgroundColor: isActive ? 'rgba(52, 211, 153, 0.12)' : 'transparent',
                                borderLeft: isActive ? '3px solid #34d399' : '3px solid transparent',
                                transition: 'all 0.2s ease',
                                fontWeight: isActive ? 700 : 400,
                                fontSize: '0.92rem',
                            }}
                            onMouseEnter={e => {
                                if (!isActive) {
                                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
                                    e.currentTarget.style.color = '#e2e8f0';
                                }
                            }}
                            onMouseLeave={e => {
                                if (!isActive) {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                    e.currentTarget.style.color = '#94A3B8';
                                }
                            }}
                        >
                            <span style={{ fontSize: '1.1rem', minWidth: '20px', textAlign: 'center' }}>
                                {item.icon}
                            </span>
                            <span>{item.label}</span>
                            {isActive && (
                                <span style={{
                                    marginLeft: 'auto', width: '6px', height: '6px',
                                    background: '#34d399', borderRadius: '50%', flexShrink: 0
                                }} />
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Cerrar Sesión */}
            <div style={{ padding: '1rem 0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <button
                    onClick={logout}
                    style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        borderRadius: '12px',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#f87171',
                        background: 'rgba(239, 68, 68, 0.07)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        fontFamily: 'inherit'
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                        e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.07)';
                        e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                    }}
                >
                    🚪 Cerrar Sesión
                </button>
            </div>
        </>
    );
};

export default Sidebar;
