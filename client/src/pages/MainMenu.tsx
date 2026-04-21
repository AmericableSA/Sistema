import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const MainMenu = () => {
    const { user, hasRole } = useAuth();

    const allModules = [
        {
            title: 'Inventario',
            desc: 'Materiales y Stock',
            path: '/inventory',
            color: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            icon: '📦',
            roles: ['admin', 'bodeguero']
        },
        {
            title: 'Clientes',
            desc: 'Contratos y Servicios',
            path: '/clients',
            color: 'linear-gradient(135deg, #10b981, #059669)',
            icon: 'busts_in_silhouette',
            roles: ['admin', 'cajero', 'oficinista']
        },
        {
            title: 'Caja & Facturación',
            desc: 'Pagos y Recibos',
            path: '/billing',
            color: 'linear-gradient(135deg, #f59e0b, #d97706)',
            icon: 'credit_card',
            roles: ['admin', 'cajero', 'oficinista']
        },
        {
            title: 'Reportes',
            desc: 'Estadísticas Globales',
            path: '/reports',
            color: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
            icon: 'bar_chart',
            roles: ['admin'] // Restricted
        },
        {
            title: 'Usuarios',
            desc: 'Gestión de Acceso',
            path: '/users',
            color: 'linear-gradient(135deg, #ec4899, #db2777)',
            icon: 'lock',
            roles: ['admin']
        },
    ];

    const visibleModules = allModules.filter(m => {
        const role = user?.role;
        const officeRoles = ['oficina', 'oficinista', 'office'];

        if (officeRoles.includes(role)) {
            const allowed = ['/clients', '/billing'];
            return allowed.includes(m.path);
        }

        return hasRole(m.roles);
    });

    return (
        <div className="page-container" style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '6rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <h1 style={{ marginBottom: '0.5rem' }}>Panel Principal</h1>
                <p style={{ color: '#64748b' }}>Bienvenido, {user?.full_name?.split(' ')[0]}</p>
            </div>

            <div className="dashboard-grid">
                {visibleModules.map((mod, index) => (
                    <Link to={mod.path} key={index} style={{ textDecoration: 'none' }}>
                        <div className="glass-card" style={{
                            height: '100%',
                            minHeight: '160px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textAlign: 'center',
                            padding: '1.5rem',
                            borderRadius: '24px',
                            background: 'rgba(30, 41, 59, 0.4)'
                        }}
                        >
                            <div style={{
                                width: '60px',
                                height: '60px',
                                borderRadius: '20px',
                                background: mod.color,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '2rem',
                                marginBottom: '1rem',
                                color: 'white',
                                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)'
                            }}>
                                {mod.icon === 'busts_in_silhouette' ? '👥' :
                                    mod.icon === 'credit_card' ? '💳' :
                                        mod.icon === 'bar_chart' ? '📊' :
                                            mod.icon === 'lock' ? '🔐' :
                                                mod.icon === 'receipt' ? '🧾' : mod.icon}
                            </div>
                            <h3 style={{ marginBottom: '0.25rem', fontSize: '1.1rem', color: 'white', fontWeight: '600' }}>{mod.title}</h3>
                            <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>{mod.desc}</p>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default MainMenu;

