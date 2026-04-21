import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';

const ROUTE_LABELS = {
    '/': 'Panel Principal',
    '/billing': 'Facturación / Caja',
    '/clients': 'Gestión de Clientes',
    '/inventory': 'Inventario General',
    '/inventory/history': 'Historial de Inventario',
    '/reports': 'Reportes y Estadísticas',
    '/users': 'Gestión de Usuarios',
    '/movements': 'Gestión de Trámites',
    '/invoices': 'Facturas',
};

const ROUTE_ICONS = {
    '/': '🏠',
    '/billing': '💳',
    '/clients': '👥',
    '/inventory': '📦',
    '/inventory/history': '📜',
    '/reports': '📊',
    '/users': '🔐',
    '/movements': '📋',
    '/invoices': '🧾',
};

const Header = ({ onMenuClick }) => {
    const { user } = useAuth();
    const location = useLocation();
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    if (!user) return null;

    const currentLabel = ROUTE_LABELS[location.pathname] || 'Sistema';
    const currentIcon = ROUTE_ICONS[location.pathname] || '📌';

    return (
        <header style={{
            height: '64px',
            background: 'rgba(11, 17, 33, 0.5)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 1.25rem',
            position: 'sticky',
            top: 0,
            zIndex: 80,
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            gap: '1rem',
        }}>
            {/* Izquierda: Hamburger + Sección actual */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                {/* Botón hamburger (móvil) */}
                <button
                    onClick={onMenuClick}
                    aria-label="Abrir menú"
                    style={{
                        display: isMobile ? 'flex' : 'none',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: 'rgba(255,255,255,0.05)',
                        color: 'white',
                        fontSize: '1.2rem',
                        cursor: 'pointer',
                        flexShrink: 0,
                        transition: 'all 0.2s',
                    }}
                >
                    ☰
                </button>

                {/* Sección actual */}
                {!isMobile && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                        <span style={{ fontSize: '1.1rem' }}>{currentIcon}</span>
                        <span style={{
                            fontSize: '0.95rem', fontWeight: 600, color: '#cbd5e1',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                        }}>
                            {currentLabel}
                        </span>
                    </div>
                )}

                {isMobile && (
                    <span style={{
                        fontSize: '0.9rem', fontWeight: 700, color: '#e2e8f0',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                    }}>
                        {currentIcon} {currentLabel}
                    </span>
                )}
            </div>

            {/* Derecha: Pill de usuario */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: '0.6rem',
                background: 'rgba(15, 23, 42, 0.6)',
                padding: '0.4rem 0.9rem 0.4rem 0.4rem',
                borderRadius: '50px',
                border: '1px solid rgba(255,255,255,0.06)',
                flexShrink: 0,
            }}>
                {/* Avatar con inicial */}
                <div style={{
                    width: '30px', height: '30px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.8rem', fontWeight: 800, color: 'white', flexShrink: 0
                }}>
                    {(user.full_name || user.username || 'U')[0].toUpperCase()}
                </div>

                {!isMobile && (
                    <div>
                        <p style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, color: 'white', lineHeight: 1.2 }}>
                            {user.full_name?.split(' ')[0] || user.username}
                        </p>
                        <span style={{ fontSize: '0.68rem', color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                            {user.role}
                        </span>
                    </div>
                )}
            </div>
        </header>
    );
};

export default Header;
