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
            <div className="animate-entry" style={{ textAlign: 'center', marginBottom: '4rem' }}>
                <h1 style={{ 
                    fontSize: '3rem', 
                    fontWeight: '800', 
                    marginBottom: '0.5rem',
                    background: 'linear-gradient(135deg, #fff 0%, #94a3b8 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                }}>
                    Panel Principal
                </h1>
                <p style={{ color: '#94a3b8', fontSize: '1.1rem' }}>
                    Bienvenido al centro de gestión, <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>{user?.full_name?.split(' ')[0]}</span>
                </p>
                <div style={{ width: '60px', height: '4px', background: '#3b82f6', margin: '1.5rem auto', borderRadius: '2px', opacity: 0.5 }}></div>
            </div>

            <div className="dashboard-grid" style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
                gap: '2rem' 
            }}>
                {visibleModules.map((mod, index) => (
                    <Link to={mod.path} key={index} style={{ textDecoration: 'none' }} className="menu-card-wrapper">
                        <div className="glass-card menu-card" style={{
                            height: '100%',
                            minHeight: '200px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textAlign: 'center',
                            padding: '2rem',
                            borderRadius: '32px',
                            background: 'rgba(30, 41, 59, 0.4)',
                            border: '1px solid rgba(255,255,255,0.05)',
                            position: 'relative',
                            overflow: 'hidden',
                            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                        >
                            {/* Glow Effect */}
                            <div className="card-glow" style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                background: `radial-gradient(circle at 50% 0%, ${mod.color.split(',')[1]}22 0%, transparent 70%)`,
                                opacity: 0,
                                transition: 'opacity 0.4s'
                            }}></div>

                            <div style={{
                                width: '80px',
                                height: '80px',
                                borderRadius: '24px',
                                background: mod.color,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '2.5rem',
                                marginBottom: '1.5rem',
                                color: 'white',
                                boxShadow: `0 20px 40px ${mod.color.split(',')[1]}33`,
                                position: 'relative',
                                zIndex: 1,
                                transition: 'transform 0.4s'
                            }} className="menu-icon">
                                {mod.icon === 'busts_in_silhouette' ? '👥' :
                                    mod.icon === 'credit_card' ? '💳' :
                                        mod.icon === 'bar_chart' ? '📊' :
                                            mod.icon === 'lock' ? '🔐' :
                                                mod.icon === 'receipt' ? '🧾' : mod.icon}
                            </div>
                            
                            <div style={{ position: 'relative', zIndex: 1 }}>
                                <h3 style={{ 
                                    marginBottom: '0.5rem', 
                                    fontSize: '1.4rem', 
                                    color: 'white', 
                                    fontWeight: '700',
                                    letterSpacing: '-0.5px'
                                }}>{mod.title}</h3>
                                <p style={{ color: '#94a3b8', fontSize: '0.95rem', margin: 0, lineHeight: '1.5' }}>{mod.desc}</p>
                            </div>

                            {/* Arrow Indicator */}
                            <div style={{ 
                                marginTop: '1.5rem', 
                                color: '#3b82f6', 
                                fontSize: '1.2rem', 
                                opacity: 0, 
                                transform: 'translateX(-10px)',
                                transition: 'all 0.3s'
                            }} className="menu-arrow">
                                ➜
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            <style>{`
                .menu-card-wrapper:hover .menu-card {
                    transform: translateY(-10px);
                    background: rgba(30, 41, 59, 0.6);
                    border-color: rgba(255,255,255,0.1);
                    box-shadow: 0 30px 60px rgba(0,0,0,0.4);
                }
                .menu-card-wrapper:hover .card-glow {
                    opacity: 1;
                }
                .menu-card-wrapper:hover .menu-icon {
                    transform: scale(1.1) rotate(5deg);
                }
                .menu-card-wrapper:hover .menu-arrow {
                    opacity: 1;
                    transform: translateX(0);
                }
                @media (max-width: 768px) {
                    .dashboard-grid {
                        gridTemplateColumns: 1fr;
                    }
                }
            `}</style>
        </div>
    );
};

export default MainMenu;

