
import React from 'react';
import { Link, useNavigate, useLocation, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ isOpen, onClose }) => {
    const location = useLocation();
    const { user, hasRole, logout } = useAuth();

    if (!user) return null;

    const getStyle = (path) => {
        const isActive = location.pathname === path;
        return {
            display: 'flex',
            alignItems: 'center',
            padding: '12px 20px',
            margin: '8px 12px',
            borderRadius: '12px',
            textDecoration: 'none',
            color: isActive ? '#fff' : '#94A3B8',
            backgroundColor: isActive ? 'rgba(52, 211, 153, 0.1)' : 'transparent',
            borderLeft: isActive ? '4px solid #34d399' : '4px solid transparent',
            transition: 'all 0.2s ease',
            fontWeight: isActive ? '600' : '400',
        };
    };

    return (
        <>
            <div style={{ padding: '24px', marginBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <h1 style={{
                    margin: 0,
                    fontSize: '22px',
                    background: 'linear-gradient(90deg, #fff, #94a3b8)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    fontWeight: '800',
                    letterSpacing: '-0.5px'
                }}>
                    AMERI-CABLE
                </h1>
            </div>

            <nav style={{ flex: 1, overflowY: 'auto' }} className="scrollbar-hide">
                <Link to="/" style={getStyle('/')} onClick={onClose}>
                    Menú
                </Link>

                {hasRole(['admin', 'office', 'collector']) && (
                    <Link to="/billing" style={getStyle('/billing')} onClick={onClose}>
                        Facturación / Caja
                    </Link>
                )}

                {hasRole(['admin', 'office', 'technician']) && (
                    <Link to="/clients" style={getStyle('/clients')} onClick={onClose}>
                        Clientes
                    </Link>
                )}

                {hasRole(['admin', 'office', 'collector']) && (
                    <Link to="/movements" style={getStyle('/movements')} onClick={onClose}>
                        Trámites / Movimientos
                    </Link>
                )}

                {hasRole(['admin']) && (
                    <Link to="/inventory" style={getStyle('/inventory')} onClick={onClose}>
                        Inventario
                    </Link>
                )}

                {hasRole(['admin']) && (
                    <Link to="/reports" style={getStyle('/reports')} onClick={onClose}>
                        Reportes
                    </Link>
                )}

                {hasRole(['admin']) && (
                    <Link to="/users" style={getStyle('/users')} onClick={onClose}>
                        Usuarios
                    </Link>
                )}

                {/* hasRole(['admin', 'cajero']) && (
                    <Link to="/invoices" style={getStyle('/invoices')} onClick={onClose}>
                        Facturas
                    </Link>
                ) */}
            </nav>

            <div style={{ padding: '20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <button
                    onClick={logout}
                    style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '8px',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#f87171',
                        background: 'rgba(239, 68, 68, 0.05)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        fontWeight: '600'
                    }}
                >
                    Cerrar Sesión
                </button>
            </div>
        </>
    );
};

export default Sidebar;
