import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
    return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isBlocked, setIsBlocked] = useState(false);
    const [blockReason, setBlockReason] = useState('');

    const logout = useCallback(() => {
        setUser(null);
        setToken(null);
        setIsBlocked(false);
        setBlockReason('');
        localStorage.removeItem('user');
        localStorage.removeItem('token');
    }, []);

    // Verificación de token en línea contra el backend
    const verifyTokenOnline = useCallback(async (jwtToken) => {
        if (!jwtToken) return false;
        try {
            const res = await fetch('/api/auth/verify', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${jwtToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (res.ok) {
                const data = await res.json();
                if (data.valid && data.user) {
                    setUser(prev => ({ ...prev, ...data.user }));
                    setIsBlocked(false);
                    return true;
                }
            }

            // Si el backend rechaza el token (401 / 403 / expirado)
            const errData = await res.json().catch(() => ({}));
            setIsBlocked(true);
            setBlockReason(errData.msg || 'Sesión expirada o token JWT no válido en línea.');
            return false;
        } catch (err) {
            console.warn("Verificación JWT en línea falló (red/servidor):", err);
            // No bloquear inmediatamente por micro-cortes de red, pero registrar aviso
            return false;
        }
    }, []);

    // Carga inicial y chequeo de sesión
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        const storedToken = localStorage.getItem('token');

        if (storedToken && storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                setUser(parsedUser);
                setToken(storedToken);

                // Forzar validación online de inmediato
                verifyTokenOnline(storedToken);
            } catch (e) {
                logout();
            }
        }
        setLoading(false);
    }, [verifyTokenOnline, logout]);

    // Heartbeat: Comprobación periódica en línea cada 45 segundos
    useEffect(() => {
        if (!token || isBlocked) return;

        const interval = setInterval(() => {
            const currentToken = localStorage.getItem('token');
            if (currentToken) {
                verifyTokenOnline(currentToken);
            } else {
                setIsBlocked(true);
                setBlockReason('Token JWT ausente. El sistema requiere inicio de sesión en línea.');
            }
        }, 45000);

        return () => clearInterval(interval);
    }, [token, isBlocked, verifyTokenOnline]);

    const login = async (username, password) => {
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.msg || 'Error al iniciar sesión');

            const userData = {
                id: data.id,
                username: data.username,
                full_name: data.full_name,
                role: data.role
            };

            setUser(userData);
            setToken(data.token);
            setIsBlocked(false);
            setBlockReason('');

            localStorage.setItem('user', JSON.stringify(userData));
            localStorage.setItem('token', data.token);

            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    };

    const hasRole = (roles) => {
        if (!user) return false;
        if (Array.isArray(roles)) {
            return roles.includes(user.role);
        }
        return user.role === roles;
    };

    const value = {
        user,
        token,
        login,
        logout,
        hasRole,
        loading,
        isBlocked,
        blockReason,
        verifyTokenOnline
    };

    return (
        <AuthContext.Provider value={value}>
            {loading ? (
                <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', background: '#0f172a', color: '#60a5fa' }}>
                    <div className="spinner"></div>
                </div>
            ) : isBlocked ? (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'radial-gradient(circle at center, #1e1b4b 0%, #030712 100%)',
                    zIndex: 99999,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    padding: '2rem', textAlign: 'center', color: '#f8fafc',
                    fontFamily: 'Inter, sans-serif'
                }}>
                    <div style={{
                        background: 'rgba(30, 41, 59, 0.7)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '24px',
                        padding: '3rem 2.5rem',
                        maxWidth: '520px',
                        width: '100%',
                        boxShadow: '0 25px 50px -12px rgba(239, 68, 68, 0.25)',
                        backdropFilter: 'blur(20px)'
                    }}>
                        <div style={{
                            width: '80px', height: '80px', borderRadius: '50%',
                            background: 'rgba(239, 68, 68, 0.15)', border: '2px solid rgba(239, 68, 68, 0.4)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '2.5rem', margin: '0 auto 1.5rem auto'
                        }}>
                            🔒
                        </div>
                        <h2 style={{ fontSize: '1.6rem', color: '#f87171', margin: '0 0 0.75rem 0', fontWeight: '800' }}>
                            Acceso Bloqueado por Seguridad
                        </h2>
                        <p style={{ color: '#cbd5e1', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
                            {blockReason || 'Se requiere validación de token JWT en línea. Su sesión ha expirado o el token de seguridad no es válido.'}
                        </p>
                        <div style={{
                            background: 'rgba(0,0,0,0.3)',
                            padding: '0.75rem',
                            borderRadius: '10px',
                            border: '1px solid rgba(255,255,255,0.06)',
                            fontSize: '0.85rem',
                            color: '#94a3b8',
                            marginBottom: '2rem'
                        }}>
                            Estado: <span style={{ color: '#ef4444', fontWeight: 'bold' }}>DESCONECTADO / NO AUTORIZADO</span>
                        </div>
                        <button
                            onClick={logout}
                            style={{
                                width: '100%', padding: '1rem',
                                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                color: 'white', border: 'none', borderRadius: '12px',
                                fontSize: '1rem', fontWeight: '700', cursor: 'pointer',
                                boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)',
                                transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            🔑 Iniciar Sesión Nuevamente
                        </button>
                    </div>
                </div>
            ) : (
                children
            )}
        </AuthContext.Provider>
    );
};


